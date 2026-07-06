import ProjectorView from "./projector-view";

export default async function DisplayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ProjectorView token={token} />;
}
