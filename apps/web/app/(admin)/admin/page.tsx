import { LiveKpiStrip } from "@/components/admin/live-kpi-strip";
import { AlertBanners } from "@/components/admin/alert-banners";
import { EventFeed } from "@/components/admin/event-feed";
import { TrendChart } from "@/components/admin/trend-chart";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 mt-1">
          Pilotage temps réel de la plateforme Doktori
        </p>
      </div>

      <AlertBanners />

      <LiveKpiStrip />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendChart />
        </div>
        <div>
          <EventFeed />
        </div>
      </div>
    </div>
  );
}
