import AuthGate from "../auth-gate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGate adminOnly>{children}</AuthGate>;
}