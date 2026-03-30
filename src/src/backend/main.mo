import AccessControl "authorization/access-control";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";



actor {
  type UserProfile = {
    displayName : Text;
    balance : Int;
  };

  module UserProfile {
    public func compare(u1 : UserProfile, u2 : UserProfile) : Order.Order {
      Text.compare(u1.displayName, u2.displayName);
    };
  };

  type DepositRequest = {
    amount : Int;
    proofBlobId : Text;
    timestamp : Time.Time;
  };

  type WithdrawalRequest = {
    amount : Int;
    upiDetails : Text;
    timestamp : Time.Time;
  };

  type RequestStatus = {
    #pending;
    #approved : Time.Time;
    #rejected : Time.Time;
  };

  type ApiConfig = {
    activationFee : Nat;
    merchantUpiId : Text;
    paymentMobileNumber : Text;
    qrCodeBlobId : Text;
  };

  type ApiActivationRequest = {
    proofBlobId : Text;
    transactionId : Text;
    timestamp : Time.Time;
    status : {
      #pending;
      #approved : Time.Time;
      #rejected : Time.Time;
    };
  };

  type ApiData = {
    token : ?Text;
    isActive : Bool;
    activationRequests : [ApiActivationRequest];
  };

  type Transaction = {
    id : Text;
    transactionType : {
      #deposit;
      #withdraw;
      #p2pSend : Principal;
      #p2pReceive : Principal;
    };
    amount : Int;
    associatedParty : ?Principal;
    timestamp : Time.Time;
    status : {
      #pending;
      #approved;
      #rejected;
    };
  };

  type NewTransaction = {
    id : Text;
    transactionType : {
      #deposit;
      #withdraw;
      #p2pSend : Principal;
      #p2pReceive : Principal;
      #apiPayment : Text;
      #apiRefund : Text;
    };
    amount : Int;
    associatedEntity : ?Text;
    timestamp : Time.Time;
    status : {
      #pending;
      #approved;
      #rejected;
    };
  };

  type PaymentSettings = {
    upiId : Text;
    phonePeNumber : Text;
    paytmNumber : Text;
    googlePayNumber : Text;
    qrCodeBlobId : Text;
  };

  type PaymentSettingsFull = {
    upiId : Text;
    phonePeNumber : Text;
    paytmNumber : Text;
    googlePayNumber : Text;
    qrCodeBlobId : Text;
    announcementText : Text;
    bannerBlobId : Text;
  };

  type MpinData = {
    mpinHash : Text;
    failedAttempts : Nat;
    lockedUntil : ?Time.Time;
  };

  type MpinStatus = {
    isSet : Bool;
    failedAttempts : Nat;
    lockedUntil : ?Time.Time;
  };

  type MpinVerifyResult = {
    success : Bool;
    attemptsLeft : Nat;
    lockedUntil : ?Time.Time;
  };

  type UserCredentials = {
    mobileHash : Text;
    passwordHash : Text;
  };

  type ApiPaymentResult = {
    success : Bool;
    message : Text;
    newBalance : Int;
  };

  type ApiStatusResult = {
    isActive : Bool;
    balance : Int;
  };

  type PendingApiActivation = {
    user : Principal;
    request : ApiActivationRequest;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let userProfiles = Map.empty<Principal, UserProfile>();
  let depositRequests = Map.empty<Principal, List.List<(DepositRequest, RequestStatus)>>();
  let withdrawalRequests = Map.empty<Principal, List.List<(WithdrawalRequest, RequestStatus)>>();
  let transactions = Map.empty<Principal, List.List<Transaction>>();
  type Message = {
    id : Text;
    text : Text;
    timestamp : Time.Time;
    isRead : Bool;
    isGlobal : Bool;
  };
  let messages = Map.empty<Principal, List.List<Text>>(); // kept for backward compat
  let userMessages = Map.empty<Principal, List.List<Message>>();
  var globalMessages = List.empty<Message>();
  let mpinStore = Map.empty<Principal, MpinData>();
  let credentialsStore = Map.empty<Principal, UserCredentials>();
  var paymentSettings : PaymentSettings = {
    upiId = "";
    phonePeNumber = "";
    paytmNumber = "";
    googlePayNumber = "";
    qrCodeBlobId = "";
  };
  var announcementText : Text = "";
  var bannerBlobId : Text = "";
  var apiConfig : ApiConfig = {
    activationFee = 0;
    merchantUpiId = "";
    paymentMobileNumber = "";
    qrCodeBlobId = "";
  };
  let apiDataStore = Map.empty<Principal, List.List<ApiActivationRequest>>();
  let apiTokenIndex = Map.empty<Text, Principal>();
  let apiActiveUsers = Map.empty<Principal, Text>(); // isActive : token

  // credentials functions
  // Check if a mobile hash is already registered by any user
  public query func isMobileHashRegistered(mobileHash : Text) : async Bool {
    for ((_, creds) in credentialsStore.entries()) {
      if (creds.mobileHash == mobileHash) { return true };
    };
    false;
  };

  public shared ({ caller }) func setUserCredentials(mobileHash : Text, passwordHash : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set credentials");
    };
    // Block duplicate mobile number registration
    for ((existingPrincipal, creds) in credentialsStore.entries()) {
      if (creds.mobileHash == mobileHash and existingPrincipal != caller) {
        Runtime.trap("DUPLICATE_MOBILE: Yeh mobile number pehle se registered hai. Ek mobile number se sirf ek account banta hai.");
      };
    };
    credentialsStore.add(caller, { mobileHash; passwordHash });
  };

  public shared ({ caller }) func verifyUserCredentials(mobileHash : Text, passwordHash : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can verify credentials");
    };
    switch (credentialsStore.get(caller)) {
      case (null) { false };
      case (?creds) { creds.mobileHash == mobileHash and creds.passwordHash == passwordHash };
    };
  };

  public query ({ caller }) func hasUserCredentials() : async Bool {
    credentialsStore.get(caller) != null;
  };

  // MPIN functions
  public shared ({ caller }) func setMpin(mpinHash : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set MPIN");
    };
    mpinStore.add(caller, {
      mpinHash;
      failedAttempts = 0;
      lockedUntil = null;
    });
  };

  public shared ({ caller }) func verifyMpin(mpinHash : Text) : async MpinVerifyResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can verify MPIN");
    };
    switch (mpinStore.get(caller)) {
      case (null) { Runtime.trap("MPIN not set") };
      case (?data) {
        let now = Time.now();
        // Check if locked
        switch (data.lockedUntil) {
          case (?lockTime) {
            if (now < lockTime) {
              return { success = false; attemptsLeft = 0; lockedUntil = ?lockTime };
            };
            // Lock expired, reset
            mpinStore.add(caller, { data with failedAttempts = 0; lockedUntil = null });
          };
          case (null) {};
        };
        let fresh = switch (mpinStore.get(caller)) {
          case (null) { data };
          case (?d) { d };
        };
        if (fresh.mpinHash == mpinHash) {
          mpinStore.add(caller, { fresh with failedAttempts = 0; lockedUntil = null });
          return { success = true; attemptsLeft = 3; lockedUntil = null };
        } else {
          let newAttempts = fresh.failedAttempts + 1;
          if (newAttempts >= 3) {
            let lockUntil = now + 30 * 60 * 1_000_000_000;
            mpinStore.add(caller, { fresh with failedAttempts = newAttempts; lockedUntil = ?lockUntil });
            return { success = false; attemptsLeft = 0; lockedUntil = ?lockUntil };
          } else {
            mpinStore.add(caller, { fresh with failedAttempts = newAttempts; lockedUntil = null });
            return { success = false; attemptsLeft = 3 - newAttempts; lockedUntil = null };
          };
        };
      };
    };
  };

  public query ({ caller }) func getMpinStatus() : async MpinStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check MPIN status");
    };
    switch (mpinStore.get(caller)) {
      case (null) { { isSet = false; failedAttempts = 0; lockedUntil = null } };
      case (?data) {
        let now = Time.now();
        switch (data.lockedUntil) {
          case (?lockTime) {
            if (now >= lockTime) {
              return { isSet = true; failedAttempts = 0; lockedUntil = null };
            };
          };
          case (null) {};
        };
        { isSet = true; failedAttempts = data.failedAttempts; lockedUntil = data.lockedUntil };
      };
    };
  };

  public shared ({ caller }) func initializeAsAdmin() : async () {
    if (userProfiles.isEmpty()) { userProfiles.add(caller, { displayName = "Admin"; balance = 0 }) };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this endpoint");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func deleteCallerUserProfile() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete profiles");
    };
    userProfiles.remove(caller);
  };

  public query ({ caller }) func getProfile(profileOwner : Principal) : async ?UserProfile {
    if (caller != profileOwner and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (userProfiles.get(profileOwner)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) { ?profile };
    };
  };

  public shared ({ caller }) func updateDisplayName(newName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update display names");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        userProfiles.add(caller, { profile with displayName = newName });
      };
    };
  };

  public query ({ caller }) func getBalance() : async Int {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view balances");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) { profile.balance };
    };
  };

  public shared ({ caller }) func submitDepositRequest(amount : Int, proofBlobId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit deposit requests");
    };
    let newReq : DepositRequest = {
      amount;
      proofBlobId;
      timestamp = Time.now();
    };
    let requestsList = switch (depositRequests.get(caller)) {
      case (null) { List.empty<(DepositRequest, RequestStatus)>() };
      case (?list) { list };
    };
    requestsList.add((newReq, #pending));
    depositRequests.add(caller, requestsList);
  };

  public shared ({ caller }) func submitWithdrawalRequest(amount : Int, upiDetails : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit withdrawal requests");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        if (profile.balance < amount) {
          Runtime.trap("Insufficient balance");
        };
        let newReq : WithdrawalRequest = {
          amount;
          upiDetails;
          timestamp = Time.now();
        };
        let requestsList = switch (withdrawalRequests.get(caller)) {
          case (null) { List.empty<(WithdrawalRequest, RequestStatus)>() };
          case (?list) { list };
        };
        requestsList.add((newReq, #pending));
        withdrawalRequests.add(caller, requestsList);
        // Deduct balance immediately (credit back if rejected)
        userProfiles.add(caller, { profile with balance = profile.balance - amount });
      };
    };
  };

  public shared ({ caller }) func p2pTransfer(to : Principal, amount : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can perform P2P transfers");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        if (not (AccessControl.hasPermission(accessControlState, to, #user))) {
          Runtime.trap("Recipient is not a valid user");
        };
        if (caller == to) {
          Runtime.trap("Cannot transfer to self");
        };
        if (profile.balance < amount) {
          Runtime.trap("Insufficient balance");
        };
        let toProfile = switch (userProfiles.get(to)) {
          case (null) { Runtime.trap("Recipient user not found") };
          case (?profile) { profile };
        };
        let newFromProfile : UserProfile = { profile with balance = profile.balance - amount };
        let newToProfile : UserProfile = { toProfile with balance = toProfile.balance + amount };
        userProfiles.add(caller, newFromProfile);
        userProfiles.add(to, newToProfile);
        let fromTrans : Transaction = {
          id = "trans_" # Time.now().toText() # "_from_" # caller.toText();
          transactionType = #p2pSend(to);
          amount;
          associatedParty = ?to;
          timestamp = Time.now();
          status = #approved;
        };
        let toTrans : Transaction = {
          id = "trans_" # Time.now().toText() # "_to_" # to.toText();
          transactionType = #p2pReceive(caller);
          amount;
          associatedParty = ?caller;
          timestamp = Time.now();
          status = #approved;
        };
        let fromTransList = switch (transactions.get(caller)) {
          case (null) { List.empty<Transaction>() };
          case (?list) { list };
        };
        fromTransList.add(fromTrans);
        transactions.add(caller, fromTransList);
        let toTransList = switch (transactions.get(to)) {
          case (null) { List.empty<Transaction>() };
          case (?list) { list };
        };
        toTransList.add(toTrans);
        transactions.add(to, toTransList);
      };
    };
  };

  public query ({ caller }) func getTransactionHistory(user : Principal) : async [Transaction] {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own transaction history");
    };
    switch (transactions.get(user)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  public query ({ caller }) func getAllUsers() : async [(Principal, UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all users");
    };
    userProfiles.entries().toArray();
  };

  public query ({ caller }) func getPaymentSettings() : async PaymentSettingsFull {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view payment settings");
    };
    {
      upiId = paymentSettings.upiId;
      phonePeNumber = paymentSettings.phonePeNumber;
      paytmNumber = paymentSettings.paytmNumber;
      googlePayNumber = paymentSettings.googlePayNumber;
      qrCodeBlobId = paymentSettings.qrCodeBlobId;
      announcementText = announcementText;
      bannerBlobId = bannerBlobId;
    };
  };

  public shared ({ caller }) func updatePaymentSettings(newSettings : PaymentSettingsFull) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update payment settings");
    };
    paymentSettings := {
      upiId = newSettings.upiId;
      phonePeNumber = newSettings.phonePeNumber;
      paytmNumber = newSettings.paytmNumber;
      googlePayNumber = newSettings.googlePayNumber;
      qrCodeBlobId = newSettings.qrCodeBlobId;
    };
    announcementText := newSettings.announcementText;
    bannerBlobId := newSettings.bannerBlobId;
  };

  public query ({ caller }) func getPendingDepositRequests() : async [(Principal, [(DepositRequest, RequestStatus)])] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view pending requests");
    };
    depositRequests.entries().map<(Principal, List.List<(DepositRequest, RequestStatus)>), (Principal, [(DepositRequest, RequestStatus)])>(func((p, list) : (Principal, List.List<(DepositRequest, RequestStatus)>)) : (Principal, [(DepositRequest, RequestStatus)]) { (p, list.toArray()) }).toArray();
  };

  public query ({ caller }) func getPendingWithdrawalRequests() : async [(Principal, [(WithdrawalRequest, RequestStatus)])] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view pending requests");
    };
    withdrawalRequests.entries().map<(Principal, List.List<(WithdrawalRequest, RequestStatus)>), (Principal, [(WithdrawalRequest, RequestStatus)])>(func((p, list) : (Principal, List.List<(WithdrawalRequest, RequestStatus)>)) : (Principal, [(WithdrawalRequest, RequestStatus)]) { (p, list.toArray()) }).toArray();
  };

  public shared ({ caller }) func approveDeposit(user : Principal, index : Nat, approved : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can approve deposits");
    };
    switch (depositRequests.get(user)) {
      case (null) { Runtime.trap("No requests found") };
      case (?list) {
        if (index >= list.size()) { Runtime.trap("Invalid index") };
        let array = list.toArray();
        let (req, status) = array[index];
        let newStatus = if (approved) { #approved(Time.now()) } else {
          #rejected(Time.now());
        };
        let newArray = array.sliceToArray(0, index).concat([(req, newStatus)]).concat(array.sliceToArray(index + 1, array.size()));
        let newList = List.fromArray<(DepositRequest, RequestStatus)>(newArray);
        if (approved) {
          switch (userProfiles.get(user)) {
            case (null) { Runtime.trap("User not found") };
            case (?profile) {
              userProfiles.add(user, { profile with balance = profile.balance + req.amount });
            };
          };
        };
        depositRequests.add(user, newList);
        // Send personal message to user
        let msgText = if (approved) {
          "✅ Aapka deposit request approve ho gaya hai. Amount ₹" # req.amount.toText() # " aapke wallet mein add ho gaya hai."
        } else {
          "❌ Aapka deposit request reject ho gaya hai. Please support se contact karein."
        };
        let msg : Message = { id = "dep_msg_" # Time.now().toText(); text = msgText; timestamp = Time.now(); isRead = false; isGlobal = false };
        let userMsgs = switch (userMessages.get(user)) { case (null) { List.empty<Message>() }; case (?l) { l } };
        userMsgs.add(msg);
        userMessages.add(user, userMsgs);
      };
    };
  };

  public shared ({ caller }) func approveWithdrawal(user : Principal, index : Nat, approved : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can approve withdrawals");
    };
    switch (withdrawalRequests.get(user)) {
      case (null) { Runtime.trap("No requests found") };
      case (?list) {
        if (index >= list.size()) { Runtime.trap("Invalid index") };
        let array = list.toArray();
        let (req, status) = array[index];
        let newStatus = if (approved) { #approved(Time.now()) } else {
          #rejected(Time.now());
        };
        let newArray = array.sliceToArray(0, index).concat([(req, newStatus)]).concat(array.sliceToArray(index + 1, array.size()));
        let newList = List.fromArray<(WithdrawalRequest, RequestStatus)>(newArray);
        // Balance was already deducted at submission; credit back if rejected
        if (not approved) {
          switch (userProfiles.get(user)) {
            case (null) { Runtime.trap("User not found") };
            case (?profile) {
              userProfiles.add(user, { profile with balance = profile.balance + req.amount });
            };
          };
        };
        withdrawalRequests.add(user, newList);
        // Send personal message to user
        let msgText2 = if (approved) {
          "✅ Aapka withdrawal request approve ho gaya hai. Amount ₹" # req.amount.toText() # " aapke UPI par transfer ho gaya hai."
        } else {
          "❌ Aapka withdrawal request reject ho gaya hai. Amount ₹" # req.amount.toText() # " aapke wallet mein wapas credit ho gaya hai."
        };
        let msg2 : Message = { id = "wd_msg_" # Time.now().toText(); text = msgText2; timestamp = Time.now(); isRead = false; isGlobal = false };
        let userMsgs2 = switch (userMessages.get(user)) { case (null) { List.empty<Message>() }; case (?l) { l } };
        userMsgs2.add(msg2);
        userMessages.add(user, userMsgs2);
      };
    };
  };

  public shared ({ caller }) func adjustBalance(user : Principal, newBalance : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can adjust balances");
    };
    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        userProfiles.add(user, { profile with balance = newBalance });
      };
    };
  };

  // API Config functions
  public query ({ caller }) func getApiConfig() : async ApiConfig {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view API config");
    };
    apiConfig;
  };

  public shared ({ caller }) func updateApiConfig(newConfig : ApiConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update API config");
    };
    apiConfig := newConfig;
  };

  // API Activation functions
  public shared ({ caller }) func submitApiActivationRequest(proofBlobId : Text, transactionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit API activation requests");
    };
    let newReq : ApiActivationRequest = {
      proofBlobId;
      transactionId;
      timestamp = Time.now();
      status = #pending;
    };

    let existingRequests = switch (apiDataStore.get(caller)) {
      case (null) { List.empty<ApiActivationRequest>() };
      case (?requests) { requests };
    };
    existingRequests.add(newReq);
    apiDataStore.add(caller, existingRequests);
  };

  public query ({ caller }) func getUserApiData() : async ApiData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their API data");
    };
    let token = switch (apiActiveUsers.get(caller)) {
      case (null) { null };
      case (?token) { ?token };
    };
    let requestsArray = switch (apiDataStore.get(caller)) {
      case (null) { [] };
      case (?requests) { requests.toArray() };
    };
    {
      token;
      isActive = token != null;
      activationRequests = requestsArray;
    };
  };

  public query ({ caller }) func getPendingApiActivationRequests() : async [PendingApiActivation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view pending API activation requests");
    };
    let result = List.empty<PendingApiActivation>();
    for ((user, requests) in apiDataStore.entries()) {
      for (request in requests.values()) {
        switch (request.status) {
          case (#pending) {
            result.add({ user; request });
          };
          case (_) {};
        };
      };
    };
    result.toArray();
  };

  public shared ({ caller }) func approveApiActivation(user : Principal, approved : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can approve API activations");
    };
    switch (apiDataStore.get(user)) {
      case (null) { Runtime.trap("No API data found for user") };
      case (?requests) {
        let updatedRequests = List.empty<ApiActivationRequest>();
        var foundPending = false;
        for (request in requests.values()) {
          switch (request.status) {
            case (#pending) {
              if (not foundPending) {
                foundPending := true;
                let newStatus = if (approved) {
                  #approved(Time.now());
                } else {
                  #rejected(Time.now());
                };
                updatedRequests.add({ request with status = newStatus });
              } else {
                updatedRequests.add(request);
              };
            };
            case (_) {
              updatedRequests.add(request);
            };
          };
        };
        if (not foundPending) {
          Runtime.trap("No pending activation request found");
        };
        // Update activation requests
        apiDataStore.add(user, updatedRequests);
        // If approved, store token
        if (approved) {
          let token = user.toText() # "_" # Time.now().toText();
          apiActiveUsers.add(user, token);
          apiTokenIndex.add(token, user);
        };
      };
    };
  };

  // API Gateway functions
  public shared ({ caller }) func processApiPayment(token : Text, amount : Nat, number : Text) : async ApiPaymentResult {
    let userPrincipal = switch (apiTokenIndex.get(token)) {
      case (null) {
        return {
          success = false;
          message = "Invalid API token";
          newBalance = 0;
        };
      };
      case (?user) { user };
    };

    if (not apiActiveUsers.containsKey(userPrincipal)) {
      return {
        success = false;
        message = "API account is not activated";
        newBalance = 0;
      };
    };

    switch (userProfiles.get(userPrincipal)) {
      case (null) {
        return {
          success = false;
          message = "User profile not found";
          newBalance = 0;
        };
      };
      case (?profile) {
        let balance = profile.balance;
        let amountInt = Int.fromNat(amount);
        if (balance < amountInt) {
          return {
            success = false;
            message = "Insufficient balance in API account";
            newBalance = balance;
          };
        } else {
          let newProfile = {
            profile with balance = balance - amountInt;
          };
          userProfiles.add(userPrincipal, newProfile);
          let trans : Transaction = {
            id = "api_" # Time.now().toText();
            transactionType = #withdraw;
            amount = amountInt;
            associatedParty = null;
            timestamp = Time.now();
            status = #approved;
          };
          let transList = switch (transactions.get(userPrincipal)) {
            case (null) { List.empty<Transaction>() };
            case (?list) { list };
          };
          transList.add(trans);
          transactions.add(userPrincipal, transList);
          {
            success = true;
            message = "API payment processed successfully";
            newBalance = balance - amountInt;
          };
        };
      };
    };
  };

  public query ({ caller }) func getApiStatus(token : Text) : async ApiStatusResult {
    let userPrincipal = switch (apiTokenIndex.get(token)) {
      case (null) {
        return {
          isActive = false;
          balance = 0;
        };
      };
      case (?user) { user };
    };
    let balance = switch (userProfiles.get(userPrincipal)) {
      case (null) { 0 };
      case (?profile) { profile.balance };
    };
    {
      isActive = apiActiveUsers.containsKey(userPrincipal);
      balance;
    };
  };

  public shared ({ caller }) func revokeApiToken(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can revoke API access");
    };
    switch (apiActiveUsers.get(user)) {
      case (null) { Runtime.trap("No API token found for user") };
      case (?token) {
        apiActiveUsers.remove(user);
        apiTokenIndex.remove(token);
      };
    };
  };

  public query ({ caller }) func getTransactions() : async [Transaction] {
    let result = List.empty<Transaction>();
    // P2P and API transactions
    switch (transactions.get(caller)) {
      case (null) {};
      case (?transList) {
        for (tx in transList.values()) { result.add(tx) };
      };
    };
    // Deposit requests
    switch (depositRequests.get(caller)) {
      case (null) {};
      case (?list) {
        var i : Nat = 0;
        for ((req, reqStatus) in list.values()) {
          let txStatus : { #pending; #approved; #rejected } = switch (reqStatus) {
            case (#pending) { #pending };
            case (#approved(_)) { #approved };
            case (#rejected(_)) { #rejected };
          };
          result.add({
            id = "dep_" # i.toText() # "_" # req.timestamp.toText();
            transactionType = #deposit;
            amount = req.amount;
            associatedParty = null;
            timestamp = req.timestamp;
            status = txStatus;
          });
          i += 1;
        };
      };
    };
    // Withdrawal requests
    switch (withdrawalRequests.get(caller)) {
      case (null) {};
      case (?list) {
        var i : Nat = 0;
        for ((req, reqStatus) in list.values()) {
          let txStatus : { #pending; #approved; #rejected } = switch (reqStatus) {
            case (#pending) { #pending };
            case (#approved(_)) { #approved };
            case (#rejected(_)) { #rejected };
          };
          result.add({
            id = "wd_" # i.toText() # "_" # req.timestamp.toText();
            transactionType = #withdraw;
            amount = req.amount;
            associatedParty = null;
            timestamp = req.timestamp;
            status = txStatus;
          });
          i += 1;
        };
      };
    };
    result.toArray()
  };

  // P2P Transfer by mobile number hash
  public shared ({ caller }) func p2pTransferByMobile(recipientMobileHash : Text, amount : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can perform P2P transfers");
    };
    // Find recipient principal by mobile hash
    var recipientPrincipal : ?Principal = null;
    for ((principal, creds) in credentialsStore.entries()) {
      if (creds.mobileHash == recipientMobileHash) {
        recipientPrincipal := ?principal;
      };
    };
    let to = switch (recipientPrincipal) {
      case (null) { Runtime.trap("Recipient mobile number not registered") };
      case (?p) { p };
    };
    if (caller == to) {
      Runtime.trap("Cannot transfer to self");
    };
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Sender profile not found") };
      case (?profile) {
        if (profile.balance < amount) {
          Runtime.trap("Insufficient balance");
        };
        let toProfile = switch (userProfiles.get(to)) {
          case (null) { Runtime.trap("Recipient user not found") };
          case (?p) { p };
        };
        userProfiles.add(caller, { profile with balance = profile.balance - amount });
        userProfiles.add(to, { toProfile with balance = toProfile.balance + amount });
        let fromTrans : Transaction = {
          id = "p2pm_" # Time.now().toText() # "_from_" # caller.toText();
          transactionType = #p2pSend(to);
          amount;
          associatedParty = ?to;
          timestamp = Time.now();
          status = #approved;
        };
        let toTrans : Transaction = {
          id = "p2pm_" # Time.now().toText() # "_to_" # to.toText();
          transactionType = #p2pReceive(caller);
          amount;
          associatedParty = ?caller;
          timestamp = Time.now();
          status = #approved;
        };
        let fromList = switch (transactions.get(caller)) {
          case (null) { List.empty<Transaction>() };
          case (?list) { list };
        };
        fromList.add(fromTrans);
        transactions.add(caller, fromList);
        let toList = switch (transactions.get(to)) {
          case (null) { List.empty<Transaction>() };
          case (?list) { list };
        };
        toList.add(toTrans);
        transactions.add(to, toList);
      };
    };
  };


  // Message functions
  public query ({ caller }) func getMessages() : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let result = List.empty<Message>();
    // Global messages
    for (gm in globalMessages.values()) { result.add(gm) };
    // Personal messages
    switch (userMessages.get(caller)) {
      case (null) {};
      case (?list) { for (m in list.values()) { result.add(m) } };
    };
    result.toArray();
  };

  public query ({ caller }) func getUnreadMessageCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    var count : Nat = 0;
    for (gm in globalMessages.values()) {
      if (not gm.isRead) { count += 1 };
    };
    switch (userMessages.get(caller)) {
      case (null) {};
      case (?list) {
        for (m in list.values()) {
          if (not m.isRead) { count += 1 };
        };
      };
    };
    count;
  };

  public shared ({ caller }) func markAllMessagesRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    // Mark personal messages as read
    switch (userMessages.get(caller)) {
      case (null) {};
      case (?list) {
        let updated = List.empty<Message>();
        for (m in list.values()) { updated.add({ m with isRead = true }) };
        userMessages.add(caller, updated);
      };
    };
    // Global messages read state -- update globally
    let updatedGlobal = List.empty<Message>();
    for (gm in globalMessages.values()) { updatedGlobal.add({ gm with isRead = true }) };
    globalMessages := updatedGlobal;
  };

  public shared ({ caller }) func sendGlobalMessage(text : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can send global messages");
    };
    let msg : Message = { id = "global_" # Time.now().toText(); text; timestamp = Time.now(); isRead = false; isGlobal = true };
    globalMessages.add(msg);
  };

  public shared ({ caller }) func sendPersonalMessage(user : Principal, text : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can send personal messages");
    };
    let msg : Message = { id = "personal_" # Time.now().toText(); text; timestamp = Time.now(); isRead = false; isGlobal = false };
    let userMsgs = switch (userMessages.get(user)) { case (null) { List.empty<Message>() }; case (?l) { l } };
    userMsgs.add(msg);
    userMessages.add(user, userMsgs);
  };


};