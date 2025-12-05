import { Settings, Shield, Wifi, Database, Cpu } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">System Configuration</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="panel-base rounded-lg p-6 space-y-4 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                            <Wifi className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg">Network Uplink</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Configure telemetry stream endpoints and RTSP video sources.</p>
                </div>

                <div className="panel-base rounded-lg p-6 space-y-4 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg">Security Protocols</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Manage access control lists and encryption keys.</p>
                </div>

                <div className="panel-base rounded-lg p-6 space-y-4 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20 transition-colors">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg">Data Retention</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Configure local storage quotas and cloud sync intervals.</p>
                </div>

                <div className="panel-base rounded-lg p-6 space-y-4 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20 transition-colors">
                            <Cpu className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg">Hardware Calibration</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Calibrate sensors, motor controllers, and servos.</p>
                </div>
            </div>
        </div>
    );
}
