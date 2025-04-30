'use client'

import React, { useState, useEffect } from 'react'
import { Check, X, Tags as TagsIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Tag } from '@/lib/types'
import apiClient from '@/lib/api/client'
import { useAnalytics } from '@/hooks/use-analytics'



interface ChartTagSelectorProps {
  selectedTags: string[]
  onTagChangeAction: (selectedTags: string[]) => void
}

export function ChartTagSelector({ 
  selectedTags, 
  onTagChangeAction 
}: ChartTagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use our analytics hook
  const analytics = useAnalytics()

  // Fetch all available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true)
        // Use apiClient to fetch tags
        const response = await apiClient.get('/tags')
        
        if (response.data && response.data.docs) {
          // Sort tags alphabetically
          const sortedTags = [...response.data.docs].sort((a, b) => 
            a.name.localeCompare(b.name)
          )
          setTags(sortedTags)
        }
        setError(null)
      } catch (error) {
        console.error('Error fetching tags:', error)
        setError(error instanceof Error ? error : new Error('Failed to fetch tags'))
      } finally {
        setLoading(false)
      }
    }

    fetchTags()
  }, [])

  // Toggle a tag selection
  const toggleTag = (tagId: string) => {
    // Check if adding or removing
    const isAdding = !selectedTags.includes(tagId)
    
    // Get tag name for analytics
    const tag = tags.find(t => String(t.id) === tagId)

    if (tag) {
      // Track tag selection/deselection
      analytics.trackTagClick(tag.name)
      analytics.trackEvent(isAdding ? 'tag_selected' : 'tag_deselected', {
        tag_id: tagId,
        tag_name: tag.name,
        tag_color: tag.color,
        total_selected: isAdding ? selectedTags.length + 1 : selectedTags.length - 1
      })
    }

    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId]
    
    onTagChangeAction(newSelectedTags)
  }

  // Clear all selected tags
  const clearTags = () => {
    // Track clear tags action
    analytics.trackEvent('tags_cleared', {
      tags_count: selectedTags.length,
      tags: selectedTags.map(id => {
        const tag = tags.find(t => String(t.id) === id)
        return tag ? tag.name : id
      })
    })

    onTagChangeAction([])
    setOpen(false)
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "border-dashed h-9 w-full justify-start text-left font-normal",
              !selectedTags.length && "text-muted-foreground"
            )}
          >
            <TagsIcon className="mr-2 h-4 w-4" />
            {selectedTags.length > 0 ? (
              <>
                <span className="truncate">
                  {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
                </span>
                <X
                  className="ml-auto h-4 w-4 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearTags()
                  }}
                />
              </>
            ) : (
              <span>Select tags</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {loading ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Loading tags...
                  </div>
                ) : error ? (
                  <div className="p-4 text-sm text-destructive text-center">
                    Error loading tags
                  </div>
                ) : (
                  tags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => toggleTag(String(tag.id))}
                    >
                      <div 
                        className="mr-2 h-4 w-4 rounded-full"
                        style={{ backgroundColor: tag.color || '#9E9E9E' }}
                      />
                      <span>{tag.name}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedTags.includes(String(tag.id)) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
              {selectedTags.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={clearTags}
                      className="justify-center text-center"
                    >
                      Clear tags
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Display selected tags as badges */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedTags.map((tagId) => {
            const tag = tags.find(t => String(t.id) === tagId)
            return tag ? (
              <Badge 
                key={tag.id} 
                variant="outline"
                className="rounded-sm px-1 font-normal"
                style={{ 
                  borderColor: tag.color || '#9E9E9E',
                  backgroundColor: `${tag.color}20` || '#9E9E9E20'
                }}
              >
                {tag.name}
                <X
                  className="ml-1 h-3 w-3 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleTag(String(tag.id))}
                />
              </Badge>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}