"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Chart, PaginatedResponse } from '@/lib/types';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, Tag as TagIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TagWithChartCount extends Tag {
  actualChartCount: number;
}

type TagCardProps = {
  tag: TagWithChartCount;
  onSelect: (tagId: string) => void;
};

const TagCard: React.FC<TagCardProps> = ({ tag, onSelect }) => {
  // Calculate size based on chart count
  const getSize = (count: number = 0) => {
    if (count > 20) return "lg";
    if (count > 10) return "md";
    return "sm";
  };

  const size = getSize(tag.actualChartCount);
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-40 h-40",
    lg: "w-48 h-48",
  };
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={() => onSelect(tag.id)}
            className={`${sizeClasses[size as keyof typeof sizeClasses]} rounded-lg p-4 flex flex-col items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary`}
            style={{
              backgroundColor: `${tag.color}20`, // Use color with transparency
              borderColor: tag.color,
              borderWidth: '2px',
              borderStyle: 'solid',
            }}
          >
            <TagIcon 
              style={{ color: tag.color }} 
              className="mb-2 h-8 w-8" 
            />
            <span className="font-medium text-center">{tag.name}</span>
            <span className="text-sm text-muted-foreground mt-1">
              {tag.actualChartCount} {tag.actualChartCount === 1 ? 'chart' : 'charts'}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{tag.name}</p>
          {tag.description && <p className="text-xs">{tag.description}</p>}
          <p className="text-xs mt-1">Click to view {tag.actualChartCount} charts</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function TagsShowcase() {
  const router = useRouter();
  const [tagsWithCounts, setTagsWithCounts] = useState<TagWithChartCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count'>('count');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all tags
        const tagsResponse = await apiClient.get('/tags');
        if (!tagsResponse.data || !tagsResponse.data.docs) {
          throw new Error('Failed to fetch tags data');
        }
        
        const tags: Tag[] = tagsResponse.data.docs;
        
        // Fetch all charts (with a high limit to get as many as possible)
        const chartsResponse = await apiClient.get('/charts?limit=500');
        if (!chartsResponse.data) {
          throw new Error('Failed to fetch charts data');
        }
        
        const charts: PaginatedResponse<Chart> = chartsResponse.data;
        
        // Count charts per tag
        const tagCounts: Record<string, number> = {};
        
        // Initialize counts for all tags to zero
        tags.forEach(tag => {
          tagCounts[tag.id] = 0;
        });
        
        // Count charts for each tag
        charts.docs.forEach(chart => {
          if (chart.tags && Array.isArray(chart.tags)) {
            chart.tags.forEach(tag => {
              // Handle both populated and non-populated tags
              const tagId = typeof tag === 'object' ? tag.id : tag;
              if (tagId && tagCounts[tagId] !== undefined) {
                tagCounts[tagId]++;
              }
            });
          }
        });
        
        // Combine tags with their actual chart counts
        const tagsWithActualCounts: TagWithChartCount[] = tags.map(tag => ({
          ...tag,
          actualChartCount: tagCounts[tag.id] || 0
        }));
        
        setTagsWithCounts(tagsWithActualCounts);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Handle tag selection
  const handleTagSelect = (tagId: string) => {
    // Navigate to charts page with tag filter applied
    router.push(`/charts?tags=${tagId}`);
  };
  
  // Filter and sort tags
  const filteredTags = tagsWithCounts
    .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else { // sort by count
        return b.actualChartCount - a.actualChartCount; // descending order
      }
    });
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between mb-6">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/10 p-6 rounded-lg text-center">
        <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Tags</h3>
        <p>{error.message}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }
  
  if (tagsWithCounts.length === 0) {
    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <TagIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Tags Found</h3>
        <p className="text-muted-foreground mb-6">
          You haven&apos;t created any tags yet. Tags help you organize your charts.
        </p>
        <Button 
          onClick={() => router.push('/admin/collections/tags/create')}
        >
          Create Your First Tag
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Filters and controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as 'name' | 'count')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Sort by chart count</SelectItem>
              <SelectItem value="name">Sort by name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Tag cards display */}
      {filteredTags.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
          {filteredTags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              onSelect={handleTagSelect}
            />
          ))}
        </div>
      ) : (
        <div className="bg-muted p-8 rounded-lg text-center">
          <h3 className="text-lg font-medium mb-2">No matching tags</h3>
          <p className="text-muted-foreground">
            No tags match your search criteria.
          </p>
        </div>
      )}
    </div>
  );
}