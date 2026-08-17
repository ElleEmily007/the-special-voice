import Link from "next/link";
import { PhoneCall } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#091526] text-white/50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <PhoneCall size={18} className="text-[#e8b800]" />
              <span className="text-white font-bold text-lg">
                The <span className="text-gradient-gold">Special Voice</span>
              </span>
            </div>
            <p className="text-xs max-w-xs leading-relaxed">
              Daily Bible stories delivered to your voicemail. No app. No interruptions. Just the
              Word of God, every day.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-white/80 font-semibold mb-2">Product</p>
              <ul className="space-y-1">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white/80 font-semibold mb-2">Account</p>
              <ul className="space-y-1">
                <li><Link href="/optin" className="hover:text-white transition-colors">Start Trial</Link></li>
                <li><Link href="/portal" className="hover:text-white transition-colors">My Account</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white/80 font-semibold mb-2">Legal</p>
              <ul className="space-y-1">
                <li>
                  <a
                    href="https://cleveribility.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://cleveribility.com/terms-of-use"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs">
          <p>© {new Date().getFullYear()} The Special Voice. All rights reserved.</p>
          <p className="mt-1 text-white/30">
            Secure payments powered by Stripe. Ringless voicemail delivery via TextP2P.
          </p>
        </div>
      </div>
    </footer>
  );
}
