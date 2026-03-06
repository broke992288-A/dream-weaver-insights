// Alert hooks — placeholder for when alerts move to the database.
// Currently alerts are static in the Alerts page.
// Future: useQuery to fetch alerts from a database table.

export function useAlerts() {
  // Will be implemented when alerts table is created
  return { alerts: [], loading: false };
}
