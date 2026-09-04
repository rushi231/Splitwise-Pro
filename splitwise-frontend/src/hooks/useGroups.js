import { useCallback, useEffect, useState } from "react";
import * as groupsApi from "../api/groups";

// Fetches the current user's groups. Returns { groups, loading, error, refetch, createGroup }
export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupsApi.listGroups();
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createGroup = useCallback(async (payload) => {
    const newGroup = await groupsApi.createGroup(payload);
    setGroups((current) => [...current, newGroup]);
    return newGroup;
  }, []);

  return { groups, loading, error, refetch, createGroup };
}