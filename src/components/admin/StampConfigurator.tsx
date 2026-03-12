import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Stamp, RotateCcw, Save, GripVertical,
  AlignStartVertical, AlignEndVertical, AlignCenterHorizontal,
  ArrowDownLeft, ArrowDownRight, PenTool
} from 'lucide-react';

export interface StampConfig {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // px
  opacity: number; // 0-1
}

interface StampConfiguratorProps {
  stampUrl: string;
  config: StampConfig;
  onChange: (config: StampConfig) => void;
  schoolId: string;
  /** Ref to the report card preview container for drag bounds */
  previewRef?: React.RefObject<HTMLDivElement>;
}

const PRESET_POSITIONS = [
  { label: 'Top Left', icon: AlignStartVertical, x: 10, y: 10 },
  { label: 'Top Right', icon: AlignEndVertical, x: 85, y: 10 },
  { label: 'Center', icon: AlignCenterHorizontal, x: 50, y: 50 },
  { label: 'Bottom Left', icon: ArrowDownLeft, x: 10, y: 75 },
  { label: 'Bottom Right', icon: ArrowDownRight, x: 85, y: 75 },
  { label: 'Near Signatures', icon: PenTool, x: 75, y: 68 },
];

const SIZE_PRESETS = [
  { label: 'Small', value: 80 },
  { label: 'Medium', value: 120 },
  { label: 'Large', value: 180 },
];

const DEFAULT_CONFIG: StampConfig = { x: 85, y: 75, size: 120, opacity: 0.4 };

export default function StampConfigurator({ stampUrl, config, onChange, schoolId, previewRef }: StampConfiguratorProps) {
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; startConfigX: number; startConfigY: number } | null>(null);

  const handlePresetPosition = (x: number, y: number) => {
    onChange({ ...config, x, y });
  };

  const handleSizePreset = (size: number) => {
    onChange({ ...config, size });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_CONFIG });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('schools')
        .update({
          stamp_position_x: config.x,
          stamp_position_y: config.y,
          stamp_size: config.size,
          stamp_opacity: config.opacity,
        } as any)
        .eq('id', schoolId);
      if (error) throw error;
      toast({ title: 'Stamp position saved', description: 'This position will apply to all report cards for this school.' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Drag handlers for the stamp overlay on the preview
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startConfigX: config.x,
      startConfigY: config.y,
    };
  }, [config.x, config.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !previewRef?.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(100, dragStartRef.current.startConfigX + dx));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.startConfigY + dy));
    onChange({ ...config, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  }, [isDragging, config, onChange, previewRef]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startConfigX: config.x,
      startConfigY: config.y,
    };
  }, [config.x, config.y]);

  useEffect(() => {
    if (!isDragging) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current || !previewRef?.current) return;
      const touch = e.touches[0];
      const rect = previewRef.current.getBoundingClientRect();
      const dx = ((touch.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const dy = ((touch.clientY - dragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, dragStartRef.current.startConfigX + dx));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.startConfigY + dy));
      onChange({ ...config, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
    };
    const onTouchEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, config, onChange, previewRef]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Stamp className="h-4 w-4" />
          Stamp Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Positions */}
        <div>
          <Label className="text-xs font-medium mb-2 block">Quick Position Presets</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_POSITIONS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1"
                onClick={() => handlePresetPosition(preset.x, preset.y)}
              >
                <preset.icon className="h-3 w-3" />
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Drag hint */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <GripVertical className="h-3 w-3" />
          Drag the stamp on the preview to position it freely
        </div>

        {/* Size */}
        <div>
          <Label className="text-xs font-medium mb-2 block">Size</Label>
          <div className="flex gap-1.5 mb-2">
            {SIZE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant={config.size === preset.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => handleSizePreset(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-14">Custom</span>
            <Slider
              value={[config.size]}
              onValueChange={([v]) => onChange({ ...config, size: v })}
              min={40}
              max={250}
              step={5}
              className="flex-1"
            />
            <span className="text-xs font-mono w-10 text-right">{config.size}px</span>
          </div>
        </div>

        {/* Opacity */}
        <div>
          <Label className="text-xs font-medium mb-2 block">Opacity</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[config.opacity * 100]}
              onValueChange={([v]) => onChange({ ...config, opacity: v / 100 })}
              min={10}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-xs font-mono w-10 text-right">{Math.round(config.opacity * 100)}%</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[100, 80, 60, 40].map((v) => (
              <Button
                key={v}
                variant={Math.round(config.opacity * 100) === v ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => onChange({ ...config, opacity: v / 100 })}
              >
                {v}%
              </Button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={handleReset} className="flex-1 gap-1">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 gap-1">
            <Save className="h-3 w-3" />
            {saving ? 'Saving...' : 'Save Position'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Saved position applies to <span className="font-medium">all report cards</span> for this school.
        </p>
      </CardContent>

      {/* Draggable stamp overlay — rendered via portal-like approach in parent */}
      {/* The parent component should render the stamp with handleMouseDown/handleTouchStart */}
      {/* Export drag handlers for parent use */}
    </Card>
  );
}

// Export a hook-like approach for the draggable stamp element
export function DraggableStampOverlay({
  stampUrl,
  config,
  onMouseDown,
  onTouchStart,
  isDragging,
}: {
  stampUrl: string;
  config: StampConfig;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  isDragging: boolean;
}) {
  const clampedX = Math.max(0, Math.min(100, config.x));
  const clampedY = Math.max(0, Math.min(100, config.y));
  const translateX = -clampedX;
  const translateY = -clampedY;

  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: 'absolute',
        left: `${clampedX}%`,
        top: `${clampedY}%`,
        transform: `translate(${translateX}%, ${translateY}%)`,
        opacity: config.opacity,
        zIndex: 20,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <img
        src={stampUrl}
        alt="School Stamp"
        draggable={false}
        style={{
          width: `${config.size}px`,
          height: `${config.size}px`,
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
      <div
        className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5"
        style={{ fontSize: '8px', lineHeight: 1 }}
      >
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    </div>
  );
}
