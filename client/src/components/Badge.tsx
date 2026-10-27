import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full tracking-tight ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export function getStatusBadge(status: string) {
  switch (status?.toUpperCase()) {
    case 'CONFIRMED':
    case 'DELIVERED':
    case 'CONSENTED':
    case 'ACTIVE':
      return <Badge variant="success">{status}</Badge>;
    case 'SCHEDULED':
    case 'PENDING':
    case 'SENT':
      return <Badge variant="info">{status}</Badge>;
    case 'RESCHEDULED':
      return <Badge variant="warning">{status}</Badge>;
    case 'CANCELLED':
    case 'FAILED':
    case 'REVOKED':
      return <Badge variant="danger">{status}</Badge>;
    case 'COMPLETED':
      return <Badge variant="purple">{status}</Badge>;
    case 'SENT_DEV_MODE':
    case 'DEV_MODE':
      return <Badge variant="neutral">DEV MODE</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}
