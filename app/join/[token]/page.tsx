import JoinPublicRoom from "./join-public-room";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinPublicRoom token={token} />;
}
