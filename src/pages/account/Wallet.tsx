import { walletBalance, walletPoints, walletTransactions } from "@/lib/fixtures/account";
import { formatPrice } from "@/lib/format";

export default function Wallet() {
  return (
    <div>
      <h1 className="font-display text-[26px] font-medium text-white">Wallet & Rewards</h1>
      <p className="mt-1 text-[15px] text-body">Your store credit and reward points.</p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-card bg-accent p-6 text-white">
          <p className="text-[13px] text-white/75">Wallet balance</p>
          <p className="mt-2 text-[32px] leading-none font-medium">{formatPrice(walletBalance)}</p>
          <p className="mt-3 text-[13px] text-white/80">Auto-applied at checkout</p>
        </div>
        <div className="rounded-card bg-card p-6">
          <p className="text-[13px] text-muted">Reward points</p>
          <p className="mt-2 text-[32px] leading-none font-medium text-white">{walletPoints}</p>
          <p className="mt-3 text-[13px] text-body">100 points = Rs. 100 off</p>
        </div>
      </div>

      <h2 className="mt-10 text-[16px] font-medium text-white">Transaction history</h2>
      <ul className="mt-4 flex flex-col divide-y divide-line border-y border-line">
        {walletTransactions.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-4">
            <div>
              <p className="text-[15px] text-white">{t.description}</p>
              <p className="text-[13px] text-muted">
                {t.date} · {t.status}
              </p>
            </div>
            <p
              className={`text-[15px] font-medium ${
                t.type === "credit" ? "text-green-700" : "text-sale"
              }`}
            >
              {t.type === "credit" ? "+" : "−"}
              {formatPrice(t.amount)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
