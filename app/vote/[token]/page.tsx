import VoteExperience from "./vote-experience";

export default async function VotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <VoteExperience token={token} />;
}
