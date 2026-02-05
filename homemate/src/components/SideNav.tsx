import { Layout, Menu } from "antd";
import {
  PieChartOutlined,
  CalendarOutlined,
  ProfileOutlined,
  WalletOutlined,
  DashboardOutlined,
} from "@ant-design/icons";

const items = [
  { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "transactions", icon: <WalletOutlined />, label: "记账" },
  { key: "analytics", icon: <PieChartOutlined />, label: "可视化" },
  { key: "events", icon: <CalendarOutlined />, label: "未来事件" },
  { key: "memos", icon: <ProfileOutlined />, label: "备忘录" },
];

export default function SideNav() {
  return (
    <Layout.Sider width={220} style={{ background: "#fff7fb" }}>
      <Menu mode="inline" items={items} defaultSelectedKeys={["dashboard"]} />
    </Layout.Sider>
  );
}
