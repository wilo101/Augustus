import DiagnosticsPanel from "@/components/firebot/DiagnosticsPanel";
import BatteryGauge from "@/components/firebot/BatteryGauge";
import WaterGauge from "@/components/firebot/WaterGauge";
import PumpPressure from "@/components/firebot/PumpPressure";
import TemperatureCard from "@/components/firebot/TemperatureCard";

export default function DiagnosticsPage() {
    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight">System Diagnostics</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <BatteryGauge value={87} />
                <WaterGauge value={64} />
                <PumpPressure value={120} />
                <TemperatureCard value={42} />
            </div>

            <div className="flex-1 panel-base rounded-lg overflow-hidden relative">
                <DiagnosticsPanel />
            </div>
        </div>
    );
}
