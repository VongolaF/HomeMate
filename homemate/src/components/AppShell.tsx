import { Layout } from "antd";
import HeaderBar from "./HeaderBar";
import SideNav from "./SideNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderBar />
      <Layout>
        <SideNav />
        <Layout.Content style={{ padding: 24 }}>{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
