export default function AdminOrganizationConsultaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="consultation-shell flex flex-col">{children}</div>;
}
