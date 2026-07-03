import { Crown, House } from "lucide-react";

export default function SiteHeader() {
  return (
    <div className="topbar">
      <a className="brand" href="/"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</a>
      <a className="btn btn-soft" href="/"><House size={15} /> Inicio</a>
    </div>
  );
}
