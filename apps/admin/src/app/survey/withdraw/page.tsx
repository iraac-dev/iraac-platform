import type { Metadata } from "next";
import WithdrawClient from "./withdraw-client";

export const metadata: Metadata = {
  title: "Withdraw or change contact preferences — Have Your Say",
  robots: { index: false, follow: false },
};

export default function WithdrawPage() {
  return <WithdrawClient />;
}
