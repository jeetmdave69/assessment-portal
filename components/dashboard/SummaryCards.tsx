"use client";

import { Card, CardContent, Typography } from "@mui/material";

export default function SummaryCards({ title, total, icon, color }: { title: string, total: number, icon?: string, color?: string }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" color={color || 'primary'}>
          {total}
        </Typography>
      </CardContent>
    </Card>
  );
}
