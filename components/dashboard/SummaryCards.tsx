"use client";

import { Card, CardContent, Typography, Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function SummaryCards() {
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [upcoming, setUpcoming] = useState(0);

useEffect(() => {
  const fetchSummary = async () => {
    const { data, error } = await supabase.from("quizzes").select("*");
    if (error || !data) {
      console.error("Failed to fetch quizzes", error);
      return;
    }

    setTotal(data.length);
    setActive(data.filter((q) => q.status === "active").length);
    setUpcoming(data.filter((q) => q.status === "upcoming").length);
  };

  fetchSummary();
}, []);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">Total Tests</Typography>
            <Typography variant="h4">{total}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">Active Tests</Typography>
            <Typography variant="h4">{active}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">Upcoming Tests</Typography>
            <Typography variant="h4">{upcoming}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
