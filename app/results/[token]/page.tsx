import ResultsView from "./results-view";

export default async function ResultsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResultsView token={token} />;
}
