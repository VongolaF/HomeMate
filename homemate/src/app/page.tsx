import AuthGate from "@/components/AuthGate";

export default function Home() {
  const user = null;
  return <AuthGate user={user}>Dashboard</AuthGate>;
}
