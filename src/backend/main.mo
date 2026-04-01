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

  type Message = {
    id : Text;
    text : Text;
    timestamp : Time.Time;
    isRead : Bool;
    isGlobal : Bool;
  };


  type GiftCode = {
    code : Text;
    amount : Int;
    maxClaims : Nat;
    claimedCount : Nat;
    createdBy : Principal;
    isAdminCreated : Bool;
    isActive : Bool;
    timestamp : Time.Time;
  };

  type GiftCodeClaim = {
    code : Text;
    amount : Int;
    timestamp : Time.Time;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // ===== STABLE BACKUP STORAGE (data persists across upgrades) =====
  stable var _stabUserProfiles : [(Principal, UserProfile)] = [];
  stable var _stabCredentials : [(Principal, UserCredentials)] = [];
  stable var _stabMobileStore : [(Principal, Text)] = [];
  stable var _stabMpinPlainStore : [(Principal, Text)] = [];
  stable var _stabPasswordPlainStore : [(Principal, Text)] = [];
  stable var _stabMpinStore : [(Principal, MpinData)] = [];
  stable var _stabDepositReqs : [(Principal, [(DepositRequest, RequestStatus)])] = [];
  stable var _stabWithdrawalReqs : [(Principal, [(WithdrawalRequest, RequestStatus)])] = [];
  stable var _stabTransactions : [(Principal, [Transaction])] = [];
  stable var _stabUserMessages : [(Principal, [Message])] = [];
  stable var _stabGlobalMessages : [Message] = [];
  stable var _stabGlobalReadTs : [(Principal, Time.Time)] = [];
  stable var _stabApiDataStore : [(Principal, [ApiActivationRequest])] = [];
  stable var _stabApiTokenIndex : [(Text, Principal)] = [];
  stable var _stabApiActiveUsers : [(Principal, Text)] = [];
  stable var _stabGiftCodes : [(Text, GiftCode)] = [];
  stable var _stabGiftCodeClaims : [(Principal, [GiftCodeClaim])] = [];

  // Simple stable vars (automatically preserved across upgrades)
  stable var paymentSettings : PaymentSettings = {
    upiId = "";
    phonePeNumber = "";
    paytmNumber = "";
    googlePayNumber = "";
    qrCodeBlobId = "";
  };
  stable var announcementText : Text = "";
  stable var bannerBlobId : Text = "";
  stable var apiConfig : ApiConfig = {
    activationFee = 0;
    merchantUpiId = "";
    paymentMobileNumber = "";
    qrCodeBlobId = "";
  };

  // ===== RUNTIME MAPS (loaded from stable storage on upgrade) =====
  let userProfiles = Map.empty<Principal, UserProfile>();
  let depositRequests = Map.empty<Principal, List.List<(DepositRequest, RequestStatus)>>();
  let withdrawalRequests = Map.empty<Principal, List.List<(WithdrawalRequest, RequestStatus)>>();
  let transactions = Map.empty<Principal, List.List<Transaction>>();
  let messages = Map.empty<Principal, List.List<Text>>(); // kept for backward compat
  let userMessages = Map.empty<Principal, List.List<Message>>();
  var globalMessages = List.empty<Message>();
  let globalReadTimestamps = Map.empty<Principal, Time.Time>(); // per-user read tracking
  let mpinStore = Map.empty<Principal, MpinData>();
  let credentialsStore = Map.empty<Principal, UserCredentials>();
  let mobileStore = Map.empty<Principal, Text>(); // plaintext mobile for admin visibility
  let mpinPlainStore = Map.empty<Principal, Text>(); // plaintext mpin for admin visibility
  let passwordPlainStore = Map.empty<Principal, Text>(); // plaintext password for admin visibility
  let apiDataStore = Map.empty<Principal, List.List<ApiActivationRequest>>();
  let apiTokenIndex = Map.empty<Text, Principal>();
  let apiActiveUsers = Map.empty<Principal, Text>(); // isActive : token
  let giftCodes = Map.empty<Text, GiftCode>();
  let giftCodeClaims = Map.empty<Principal, List.List<GiftCodeClaim>>();


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

  type AdminUserInfo = {
    principalText : Text;
    name : Text;
    mobile : Text;
    mpin : Text;
    password : Text;
    balance : Int;
    isLocked : Bool;
  };

  public shared ({ caller }) func saveAdminVisibleData(mobile : Text, mpin : Text, password : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    mobileStore.add(caller, mobile);
    mpinPlainStore.add(caller, mpin);
    passwordPlainStore.add(caller, password);
  };

  public query ({ caller }) func adminGetAllUserDetails() : async [AdminUserInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view user details");
    };
    var result = List.empty<AdminUserInfo>();
    for ((principal, profile) in userProfiles.entries()) {
      let mobile = switch (mobileStore.get(principal)) { case (?m) m; case null "" };
      let mpin = switch (mpinPlainStore.get(principal)) { case (?p) p; case null "" };
      let password = switch (passwordPlainStore.get(principal)) { case (?pw) pw; case null "" };
      let isLocked = switch (mpinStore.get(principal)) {
        case (?data) {
          switch (data.lockedUntil) {
            case (?lockTime) { Time.now() < lockTime };
            case null { false };
          };
        };
        case null { false };
      };
      result.add({
        principalText = principal.toText();
        name = profile.displayName;
        mobile;
        mpin;
        password;
        balance = profile.balance;
        isLocked;
      });
    };
    result.toArray();
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
          "\u{2705} Aapka deposit request approve ho gaya hai. Amount \u{20B9}" # req.amount.toText() # " aapke wallet mein add ho gaya hai."
        } else {
          "\u{274C} Aapka deposit request reject ho gaya hai. Please support se contact karein."
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
          "\u{2705} Aapka withdrawal request approve ho gaya hai. Amount \u{20B9}" # req.amount.toText() # " aapke UPI par transfer ho gaya hai."
        } else {
          "\u{274C} Aapka withdrawal request reject ho gaya hai. Amount \u{20B9}" # req.amount.toText() # " aapke wallet mein wapas credit ho gaya hai."
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
    let userReadTime : Time.Time = switch (globalReadTimestamps.get(caller)) {
      case (null) { 0 };
      case (?t) { t };
    };
    let result = List.empty<Message>();
    // Global messages with per-user isRead tracking
    for (gm in globalMessages.values()) {
      result.add({ gm with isRead = gm.timestamp <= userReadTime });
    };
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
    let userReadTime : Time.Time = switch (globalReadTimestamps.get(caller)) {
      case (null) { 0 };
      case (?t) { t };
    };
    var count : Nat = 0;
    // Global messages: unread if sent after user's last read timestamp
    for (gm in globalMessages.values()) {
      if (gm.timestamp > userReadTime) { count += 1 };
    };
    // Personal messages
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
    // Track per-user global read timestamp
    globalReadTimestamps.add(caller, Time.now());
    // Mark personal messages as read
    switch (userMessages.get(caller)) {
      case (null) {};
      case (?list) {
        let updated = List.empty<Message>();
        for (m in list.values()) { updated.add({ m with isRead = true }) };
        userMessages.add(caller, updated);
      };
    };
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


  // ===== LIVE CHAT SUPPORT SYSTEM =====

  type ChatMessage = {
    id : Text;
    senderIsAdmin : Bool;
    text : Text;
    timestamp : Time.Time;
  };

  type ChatQueueEntry = {
    user : Principal;
    mobileNumber : Text;
    joinedAt : Time.Time;
  };

  type ChatQueueStatus = {
    position : Int; // 0 = not in queue, 1 = active, 2+ = waiting
    isActive : Bool;
    queueLength : Int;
    mobileNumber : Text;
  };

  type ActiveChatInfo = {
    user : Principal;
    mobileNumber : Text;
    joinedAt : Time.Time;
  };

  // Chat state
  var chatQueue = List.empty<ChatQueueEntry>();
  var chatMessages = List.empty<ChatMessage>();
  var activeChatUser : ?ChatQueueEntry = null;

  // User joins the chat queue
  public shared ({ caller }) func joinChatQueue(mobileNumber : Text) : async ChatQueueStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    // Check if already in queue or active
    switch (activeChatUser) {
      case (?active) {
        if (active.user == caller) {
          return { position = 1; isActive = true; queueLength = chatQueue.size() + 1; mobileNumber = active.mobileNumber };
        };
      };
      case (null) {};
    };
    var pos : Int = 0;
    var found = false;
    var i : Int = 1;
    for (entry in chatQueue.values()) {
      if (entry.user == caller) { pos := i + 1; found := true };
      i += 1;
    };
    if (found) {
      let total : Int = chatQueue.size() + (switch (activeChatUser) { case (null) { 0 }; case (?_) { 1 } });
      return { position = pos; isActive = false; queueLength = total; mobileNumber = mobileNumber };
    };
    // Add to queue
    let entry : ChatQueueEntry = { user = caller; mobileNumber; joinedAt = Time.now() };
    // If no active chat, become active immediately
    switch (activeChatUser) {
      case (null) {
        activeChatUser := ?entry;
        chatMessages := List.empty<ChatMessage>();
        return { position = 1; isActive = true; queueLength = 1; mobileNumber };
      };
      case (?_) {
        chatQueue.add(entry);
        let qLen : Int = chatQueue.size() + 1;
        return { position = qLen; isActive = false; queueLength = qLen; mobileNumber };
      };
    };
  };

  // User leaves the queue or ends their active chat
  public shared ({ caller }) func leaveChatQueue() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (activeChatUser) {
      case (?active) {
        if (active.user == caller) {
          // Promote next in queue
          if (chatQueue.isEmpty()) {
            activeChatUser := null;
            chatMessages := List.empty<ChatMessage>();
          } else {
            // Pop first element from queue
            var promoted : ?ChatQueueEntry = null;
            let rest = List.empty<ChatQueueEntry>();
            var isFirst = true;
            for (entry in chatQueue.values()) {
              if (isFirst) { promoted := ?entry; isFirst := false }
              else { rest.add(entry) };
            };
            chatQueue := rest;
            activeChatUser := promoted;
            chatMessages := List.empty<ChatMessage>();
          };
          return;
        };
      };
      case (null) {};
    };
    // Remove from waiting queue
    let newQueue = List.empty<ChatQueueEntry>();
    for (entry in chatQueue.values()) {
      if (entry.user != caller) { newQueue.add(entry) };
    };
    chatQueue := newQueue;
  };

  // Get current chat queue status for caller
  public query ({ caller }) func getChatQueueStatus() : async ChatQueueStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let totalLen : Int = chatQueue.size() + (switch (activeChatUser) { case (null) { 0 }; case (?_) { 1 } });
    switch (activeChatUser) {
      case (?active) {
        if (active.user == caller) {
          return { position = 1; isActive = true; queueLength = totalLen; mobileNumber = active.mobileNumber };
        };
      };
      case (null) {};
    };
    var pos : Int = 0;
    var mobile : Text = "";
    var i : Int = 2;
    for (entry in chatQueue.values()) {
      if (entry.user == caller) { pos := i; mobile := entry.mobileNumber };
      i += 1;
    };
    if (pos > 0) {
      return { position = pos; isActive = false; queueLength = totalLen; mobileNumber = mobile };
    };
    { position = 0; isActive = false; queueLength = totalLen; mobileNumber = "" };
  };

  // User sends a chat message (only active user can send)
  public shared ({ caller }) func sendChatMessage(text : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (activeChatUser) {
      case (?active) {
        if (active.user == caller) {
          let msg : ChatMessage = {
            id = "chat_" # Time.now().toText();
            senderIsAdmin = false;
            text;
            timestamp = Time.now();
          };
          chatMessages.add(msg);
          return;
        };
      };
      case (null) {};
    };
    Runtime.trap("You are not the active chat user");
  };

  // Get chat messages (active user or admin)
  public query ({ caller }) func getChatMessages() : async [ChatMessage] {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let isUser = switch (activeChatUser) {
      case (?active) { active.user == caller };
      case (null) { false };
    };
    if (not isAdmin and not isUser) {
      return [];
    };
    chatMessages.toArray();
  };

  // Admin: get active chat info
  public query ({ caller }) func getActiveChatInfo() : async ?ActiveChatInfo {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Admin only");
    };
    switch (activeChatUser) {
      case (null) { null };
      case (?entry) { ?{ user = entry.user; mobileNumber = entry.mobileNumber; joinedAt = entry.joinedAt } };
    };
  };

  // Admin: get full chat queue
  public query ({ caller }) func getChatQueueList() : async [ChatQueueEntry] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Admin only");
    };
    chatQueue.toArray();
  };

  // Admin: send message in active chat
  public shared ({ caller }) func adminSendChatMessage(text : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let msg : ChatMessage = {
      id = "chat_admin_" # Time.now().toText();
      senderIsAdmin = true;
      text;
      timestamp = Time.now();
    };
    chatMessages.add(msg);
  };

  // Admin: end current chat and promote next user
  public shared ({ caller }) func endCurrentChat() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Admin only");
    };
    if (chatQueue.isEmpty()) {
      activeChatUser := null;
      chatMessages := List.empty<ChatMessage>();
    } else {
      // Pop first element from queue
      var promoted : ?ChatQueueEntry = null;
      let rest2 = List.empty<ChatQueueEntry>();
      var isFirst2 = true;
      for (entry in chatQueue.values()) {
        if (isFirst2) { promoted := ?entry; isFirst2 := false }
        else { rest2.add(entry) };
      };
      chatQueue := rest2;
      activeChatUser := promoted;
      chatMessages := List.empty<ChatMessage>();
    };
  };



  // ===== GIFT CODE SYSTEM =====

  public shared ({ caller }) func createGiftCode(codeSuffix : Text, amount : Int, maxClaims : Nat) : async { #ok : Text; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };
    if (amount <= 0) { return #err("Amount must be positive") };
    if (maxClaims == 0) { return #err("Max claims must be at least 1") };
    if (codeSuffix.size() == 0) { return #err("Code suffix cannot be empty") };
    let fullCode = "SRIN_" # codeSuffix;
    if (giftCodes.get(fullCode) != null) { return #err("Code already exists") };
    let profile = switch (userProfiles.get(caller)) {
      case (null) { return #err("Profile not found") };
      case (?p) { p };
    };
    if (profile.balance < amount) { return #err("Insufficient balance") };
    // Deduct from wallet
    userProfiles.add(caller, { profile with balance = profile.balance - amount });
    let code : GiftCode = {
      code = fullCode;
      amount;
      maxClaims;
      claimedCount = 0;
      createdBy = caller;
      isAdminCreated = false;
      isActive = true;
      timestamp = Time.now();
    };
    giftCodes.add(fullCode, code);
    #ok(fullCode)
  };

  public shared ({ caller }) func adminCreateGiftCode(codeSuffix : Text, amount : Int, maxClaims : Nat) : async { #ok : Text; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return #err("Unauthorized: Admin only");
    };
    if (amount <= 0) { return #err("Amount must be positive") };
    if (maxClaims == 0) { return #err("Max claims must be at least 1") };
    let fullCode = "SRIN_" # codeSuffix;
    if (giftCodes.get(fullCode) != null) { return #err("Code already exists") };
    let code : GiftCode = {
      code = fullCode;
      amount;
      maxClaims;
      claimedCount = 0;
      createdBy = caller;
      isAdminCreated = true;
      isActive = true;
      timestamp = Time.now();
    };
    giftCodes.add(fullCode, code);
    #ok(fullCode)
  };

  public shared ({ caller }) func claimGiftCode(fullCode : Text) : async { #ok : Int; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };
    let gc = switch (giftCodes.get(fullCode)) {
      case (null) { return #err("Invalid gift code") };
      case (?g) { g };
    };
    if (not gc.isActive) { return #err("Gift code is inactive") };
    if (gc.claimedCount >= gc.maxClaims) { return #err("Gift code fully claimed") };
    // Check if caller already claimed
    let myClaims = switch (giftCodeClaims.get(caller)) {
      case (null) { List.empty<GiftCodeClaim>() };
      case (?c) { c };
    };
    for (claim in myClaims.values()) {
      if (claim.code == fullCode) { return #err("Already claimed this code") };
    };
    // Prevent creator from claiming own code
    if (gc.createdBy == caller and not gc.isAdminCreated) {
      return #err("Cannot claim your own gift code");
    };
    // Credit wallet
    let profile = switch (userProfiles.get(caller)) {
      case (null) { return #err("Profile not found") };
      case (?p) { p };
    };
    userProfiles.add(caller, { profile with balance = profile.balance + gc.amount });
    // Record claim
    let newClaim : GiftCodeClaim = { code = fullCode; amount = gc.amount; timestamp = Time.now() };
    myClaims.add(newClaim);
    giftCodeClaims.add(caller, myClaims);
    // Update claimedCount
    giftCodes.add(fullCode, { gc with claimedCount = gc.claimedCount + 1 });
    #ok(gc.amount)
  };

  public query ({ caller }) func getMyGiftCodes() : async [GiftCode] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    var result = List.empty<GiftCode>();
    for ((_, gc) in giftCodes.entries()) {
      if (gc.createdBy == caller) { result.add(gc) };
    };
    result.toArray()
  };

  public query ({ caller }) func getMyGiftCodeClaims() : async [GiftCodeClaim] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (giftCodeClaims.get(caller)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    }
  };

  public query ({ caller }) func adminGetAllGiftCodes() : async [(Text, GiftCode)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin only");
    };
    var result = List.empty<(Text, GiftCode)>();
    for ((k, v) in giftCodes.entries()) { result.add((k, v)) };
    result.toArray()
  };

  public shared ({ caller }) func adminToggleGiftCode(code : Text, isActive : Bool) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return #err("Unauthorized: Admin only");
    };
    switch (giftCodes.get(code)) {
      case (null) { #err("Code not found") };
      case (?gc) {
        giftCodes.add(code, { gc with isActive });
        #ok
      };
    }
  };

  // ===== UPGRADE HOOKS: Data persists across all future deploys =====

  system func preupgrade() {
    // Serialize Maps to stable arrays before upgrade
    var b1 = List.empty<(Principal, UserProfile)>();
    for ((p, v) in userProfiles.entries()) { b1.add((p, v)) };
    _stabUserProfiles := b1.toArray();

    var b2 = List.empty<(Principal, UserCredentials)>();
    for ((p, v) in credentialsStore.entries()) { b2.add((p, v)) };
    _stabCredentials := b2.toArray();

    var b3 = List.empty<(Principal, Text)>();
    for ((p, v) in mobileStore.entries()) { b3.add((p, v)) };
    _stabMobileStore := b3.toArray();

    var b4 = List.empty<(Principal, Text)>();
    for ((p, v) in mpinPlainStore.entries()) { b4.add((p, v)) };
    _stabMpinPlainStore := b4.toArray();

    var bPw = List.empty<(Principal, Text)>();
    for ((p, v) in passwordPlainStore.entries()) { bPw.add((p, v)) };
    _stabPasswordPlainStore := bPw.toArray();

    var b5 = List.empty<(Principal, MpinData)>();
    for ((p, v) in mpinStore.entries()) { b5.add((p, v)) };
    _stabMpinStore := b5.toArray();

    var b6 = List.empty<(Principal, [(DepositRequest, RequestStatus)])>();
    for ((p, list) in depositRequests.entries()) { b6.add((p, list.toArray())) };
    _stabDepositReqs := b6.toArray();

    var b7 = List.empty<(Principal, [(WithdrawalRequest, RequestStatus)])>();
    for ((p, list) in withdrawalRequests.entries()) { b7.add((p, list.toArray())) };
    _stabWithdrawalReqs := b7.toArray();

    var b8 = List.empty<(Principal, [Transaction])>();
    for ((p, list) in transactions.entries()) { b8.add((p, list.toArray())) };
    _stabTransactions := b8.toArray();

    var b9 = List.empty<(Principal, [Message])>();
    for ((p, list) in userMessages.entries()) { b9.add((p, list.toArray())) };
    _stabUserMessages := b9.toArray();

    _stabGlobalMessages := globalMessages.toArray();

    var b10 = List.empty<(Principal, Time.Time)>();
    for ((p, t) in globalReadTimestamps.entries()) { b10.add((p, t)) };
    _stabGlobalReadTs := b10.toArray();

    var b11 = List.empty<(Principal, [ApiActivationRequest])>();
    for ((p, list) in apiDataStore.entries()) { b11.add((p, list.toArray())) };
    _stabApiDataStore := b11.toArray();

    var b12 = List.empty<(Text, Principal)>();
    for ((t, p) in apiTokenIndex.entries()) { b12.add((t, p)) };
    _stabApiTokenIndex := b12.toArray();

    var b13 = List.empty<(Principal, Text)>();
    for ((p, t) in apiActiveUsers.entries()) { b13.add((p, t)) };
    _stabApiActiveUsers := b13.toArray();

    var bgc = List.empty<(Text, GiftCode)>();
    for ((k, v) in giftCodes.entries()) { bgc.add((k, v)) };
    _stabGiftCodes := bgc.toArray();

    var bgcc = List.empty<(Principal, [GiftCodeClaim])>();
    for ((p, list) in giftCodeClaims.entries()) { bgcc.add((p, list.toArray())) };
    _stabGiftCodeClaims := bgcc.toArray();
  };

  system func postupgrade() {
    // Restore Maps from stable arrays after upgrade
    for ((p, v) in _stabUserProfiles.vals()) { userProfiles.add(p, v) };
    for ((p, v) in _stabCredentials.vals()) { credentialsStore.add(p, v) };
    for ((p, v) in _stabMobileStore.vals()) { mobileStore.add(p, v) };
    for ((p, v) in _stabMpinPlainStore.vals()) { mpinPlainStore.add(p, v) };
    for ((p, v) in _stabPasswordPlainStore.vals()) { passwordPlainStore.add(p, v) };
    for ((p, v) in _stabMpinStore.vals()) { mpinStore.add(p, v) };
    for ((p, arr) in _stabDepositReqs.vals()) {
      depositRequests.add(p, List.fromArray<(DepositRequest, RequestStatus)>(arr));
    };
    for ((p, arr) in _stabWithdrawalReqs.vals()) {
      withdrawalRequests.add(p, List.fromArray<(WithdrawalRequest, RequestStatus)>(arr));
    };
    for ((p, arr) in _stabTransactions.vals()) {
      transactions.add(p, List.fromArray<Transaction>(arr));
    };
    for ((p, arr) in _stabUserMessages.vals()) {
      userMessages.add(p, List.fromArray<Message>(arr));
    };
    globalMessages := List.fromArray<Message>(_stabGlobalMessages);
    for ((p, t) in _stabGlobalReadTs.vals()) { globalReadTimestamps.add(p, t) };
    for ((p, arr) in _stabApiDataStore.vals()) {
      apiDataStore.add(p, List.fromArray<ApiActivationRequest>(arr));
    };
    for ((t, p) in _stabApiTokenIndex.vals()) { apiTokenIndex.add(t, p) };
    for ((p, t) in _stabApiActiveUsers.vals()) { apiActiveUsers.add(p, t) };
    for ((k, v) in _stabGiftCodes.vals()) { giftCodes.add(k, v) };
    for ((p, arr) in _stabGiftCodeClaims.vals()) {
      giftCodeClaims.add(p, List.fromArray<GiftCodeClaim>(arr));
    };
  };

};
