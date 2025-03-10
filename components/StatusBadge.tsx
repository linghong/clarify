import React from 'react';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Clock, CheckCircle, Circle } from "lucide-react";

type Status = 'not_started' | 'in_progress' | 'completed';

interface StatusBadgeProps {
  status: Status;
  onStatusChange: (status: Status) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function StatusBadge({
  status,
  onStatusChange,
  size = 'md',
  disabled = false
}: StatusBadgeProps) {
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'not_started': return 'bg-gray-200 hover:bg-gray-300 text-gray-700';
      case 'in_progress': return 'bg-blue-100 hover:bg-blue-200 text-blue-700';
      case 'completed': return 'bg-green-100 hover:bg-green-200 text-green-700';
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'not_started': return <Circle className="h-3.5 w-3.5 mr-1" />;
      case 'in_progress': return <Clock className="h-3.5 w-3.5 mr-1" />;
      case 'completed': return <CheckCircle className="h-3.5 w-3.5 mr-1" />;
    }
  };

  const getStatusText = (status: Status) => {
    switch (status) {
      case 'not_started': return 'Not Started';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
    }
  };

  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2',
    md: 'text-sm py-1 px-2.5',
    lg: 'text-base py-1.5 px-3'
  };

  const handleStatusChange = async (newStatus: Status, e: React.MouseEvent) => {
    e.stopPropagation();

    if (status !== newStatus) {
      await onStatusChange(newStatus);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled} onClick={(e) => e.stopPropagation()}>
        <Badge
          className={`cursor-pointer flex items-center ${getStatusColor(status)} ${sizeClasses[size]}`}
        >
          {getStatusIcon(status)}
          <span>{getStatusText(status)}</span>
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={(e) => handleStatusChange('not_started', e)}>
          <Circle className="h-4 w-4 mr-2" />
          Not Started
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleStatusChange('in_progress', e)}>
          <Clock className="h-4 w-4 mr-2" />
          In Progress
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleStatusChange('completed', e)}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Completed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}