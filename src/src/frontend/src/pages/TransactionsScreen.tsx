import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import type { Transaction } from "../backend.d";
import { Variant_pending_approved_rejected } from "../backend.d";
import { useTransactionHistory } from "../hooks/useQueries";
import { formatDate, formatRupees } from "../utils/format";

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4"];

function TxIcon({ tx }: { tx: Transaction }) {
  const kind = tx.transactionType.__kind__;
  if (kind === "deposit" || kind === "p2pReceive") {
    return (
      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
      <ArrowUpRight className="w-5 h-5 text-rose-400" />
    </div>
  );
}

function TxLabel({ tx }: { tx: Transaction }) {
  const kind = tx.transactionType.__kind__;
  if (kind === "deposit") return "Deposit";
  if (kind === "withdraw") return "Withdrawal";
  if (kind === "p2pSend") return "P2P Sent";
  if (kind === "p2pReceive") return "P2P Received";
  return "Transaction";
}

function StatusBadge({
  status,
}: { status: Variant_pending_approved_rejected }) {
  if (status === Variant_pending_approved_rejected.approved) {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
        Approved
      </Badge>
    );
  }
  if (status === Variant_pending_approved_rejected.rejected) {
    return (
      <Badge className="bg-rose-500/20 text-rose-400 border-0 text-xs">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
      Pending
    </Badge>
  );
}

export default function TransactionsScreen() {
  const { data: transactions, isLoading } = useTransactionHistory();

  const isCredit = (tx: Transaction) => {
    const kind = tx.transactionType.__kind__;
    return kind === "deposit" || kind === "p2pReceive";
  };

  return (
    <div className="flex flex-col min-h-full animate-slide-in">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <Clock className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-foreground">Transaction History</h1>
      </header>

      <div className="flex-1 px-4 py-4">
        {isLoading ? (
          <div data-ocid="transactions.loading_state" className="space-y-3">
            {SKELETON_KEYS.map((k) => (
              <div
                key={k}
                className="flex items-center gap-3 p-4 bg-card rounded-2xl"
              >
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div
            data-ocid="transactions.empty_state"
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <ArrowLeftRight className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground text-center">
              Your deposit and withdrawal history will appear here
            </p>
          </div>
        ) : (
          <div data-ocid="transactions.list" className="space-y-3">
            {transactions.map((tx, idx) => (
              <div
                key={tx.id}
                data-ocid={`transactions.item.${idx + 1}`}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl"
              >
                <TxIcon tx={tx} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">
                    <TxLabel tx={tx} />
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatDate(tx.timestamp)}
                  </p>
                  <StatusBadge status={tx.status} />
                </div>
                <span
                  className={`font-bold text-sm ${isCredit(tx) ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {isCredit(tx) ? "+" : "-"}
                  {formatRupees(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
