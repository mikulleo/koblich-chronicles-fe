import { ChartGallery } from "@/components/charts/chart-gallery";

export default function ChartsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Stock Charts</h1>
      <ChartGallery />
    </div>
  );
}