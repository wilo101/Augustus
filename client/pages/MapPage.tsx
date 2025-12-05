import MapPanel from "@/components/firebot/MapPanel";
import { useState } from "react";

export default function MapPage() {
    const [follow, setFollow] = useState(true);
    return (
        <div className="h-[calc(100vh-8rem)] w-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Global Positioning System</h1>
            </div>
            <div className="flex-1 panel-base rounded-lg overflow-hidden relative">
                <MapPanel follow={follow} onFollowChange={setFollow} heightClass="h-full" />
            </div>
        </div>
    );
}
