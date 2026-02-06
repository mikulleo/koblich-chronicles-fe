import { TagsShowcase } from "@/components/tags/tags-showcase";
import { TagsStats } from "@/components/tags/tags-stats";
import { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Chart Tags | Koblich Chronicles",
  description: "Browse and filter stock charts by tags",
};

export default function TagsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Chart Tags</h1>
      <p className="text-muted-foreground mb-8">
        Select a tag to view related stock charts. Tags help to organize and discover
        patterns across different stocks and timeframes.
      </p>
      
      <Tabs defaultValue="showcase" className="w-full">
        <TabsList>
          <TabsTrigger value="showcase" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tag Showcase
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tag Performance
          </TabsTrigger>
        </TabsList>
        <TabsContent value="showcase" className="mt-6">
          <TagsShowcase />
        </TabsContent>
        <TabsContent value="statistics" className="mt-6">
          <TagsStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}