import { Layout, Typography } from "antd";

export default function HeaderBar() {
  return (
    <Layout.Header style={{ background: "#ffe6f0" }}>
      <Typography.Title level={3} style={{ margin: 0, color: "#ff5fa2" }}>
        HomeMate
      </Typography.Title>
    </Layout.Header>
  );
}
