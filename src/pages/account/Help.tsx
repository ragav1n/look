import { Link } from "react-router-dom";
import { site } from "@/config/site";

export default function Help() {
  return (
    <div>
      <h1 className="font-display text-[26px] font-medium text-black">Help & Support</h1>
      <p className="mt-1 text-[15px] text-body">
        Have a question about an order, sizing, or a return? Our team is always happy to help.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <a href={site.emailHref} className="rounded-card border border-line p-5 transition-colors hover:border-accent">
          <p className="text-[13px] text-muted">Email us</p>
          <p className="mt-1 text-[15px] font-medium text-black">{site.email}</p>
        </a>
        <a href={site.phoneHref} className="rounded-card border border-line p-5 transition-colors hover:border-accent">
          <p className="text-[13px] text-muted">Call us</p>
          <p className="mt-1 text-[15px] font-medium text-black">{site.phone}</p>
        </a>
        <a
          href={site.instagram}
          target="_blank"
          rel="noreferrer"
          className="rounded-card border border-line p-5 transition-colors hover:border-accent"
        >
          <p className="text-[13px] text-muted">Message us</p>
          <p className="mt-1 text-[15px] font-medium text-black">{site.instagramHandle}</p>
        </a>
        <Link to="/support" className="rounded-card border border-line p-5 transition-colors hover:border-accent">
          <p className="text-[13px] text-muted">Browse</p>
          <p className="mt-1 text-[15px] font-medium text-black">FAQs & support →</p>
        </Link>
      </div>
    </div>
  );
}
