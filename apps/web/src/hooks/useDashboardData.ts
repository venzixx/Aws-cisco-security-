import { useEffect, useState } from "react";
import type { DashboardPayload } from "@monitoring/shared";

import { fetchDashboard } from "../api/client";

interface DashboardState {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let active = true;

    fetchDashboard()
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          data,
          loading: false,
          error: null
        });
      })
      .catch((error: Error) => {
        if (!active) {
          return;
        }

        setState({
          data: null,
          loading: false,
          error: error.message
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
