import ManageEvent from "./manage-event";

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ManageEvent token={token} />;
}
