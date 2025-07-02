"use client";

import { Card, CardContent, Typography } from "@mui/material";

export default function SummaryCards({ title, total, icon, color, countColor }: { title: string, total: number, icon?: string, color?: string, countColor?: string }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color: countColor || color || 'primary', fontWeight: 800 }}>
          {total}
        </Typography>
      </CardContent>
    </Card>
  );
}
