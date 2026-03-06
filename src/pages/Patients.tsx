import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Users, AlertTriangle, Activity, Heart } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { useAllPatients } from "@/hooks/usePatients";
import { riskColorClass, getAge } from "@/utils/risk";

export default function Patients() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [organFilter, setOrganFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const navigate = useNavigate();

  const { data: patients = [], isLoading: loading } = useAllPatients();

  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrgan = organFilter === "all" || p.organ_type.toLowerCase() === organFilter.toLowerCase();
    const matchesRisk = riskFilter === "all" || p.risk_level === riskFilter;
    return matchesSearch && matchesOrgan && matchesRisk;
  });

  const getRiskBadge = (level: string) => <Badge className={riskColorClass(level)}>{level.toUpperCase()}</Badge>;

  const stats = {
    total: patients.length,
    high: patients.filter(p => p.risk_level === "high").length,
    medium: patients.filter(p => p.risk_level === "medium").length,
    low: patients.filter(p => p.risk_level === "low").length,
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{loading ? "—" : stats.total}</p><p className="text-xs text-muted-foreground">{t("patients.total")}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Heart className="w-5 h-5 text-success" /></div><div><p className="text-2xl font-bold text-foreground">{loading ? "—" : stats.low}</p><p className="text-xs text-muted-foreground">Low Risk</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Activity className="w-5 h-5 text-warning" /></div><div><p className="text-2xl font-bold text-foreground">{loading ? "—" : stats.medium}</p><p className="text-xs text-muted-foreground">Medium Risk</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div><div><p className="text-2xl font-bold text-foreground">{loading ? "—" : stats.high}</p><p className="text-xs text-muted-foreground">High Risk</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">{t("patients.recipientsList")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => navigate("/add-patient")}><UserPlus className="w-4 h-4 mr-2" />{t("patients.newTransplant")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("patients.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={organFilter} onValueChange={setOrganFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t("patients.organ")} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("patients.allOrgans")}</SelectItem><SelectItem value="kidney">{t("analytics.kidney")}</SelectItem><SelectItem value="liver">{t("analytics.liver")}</SelectItem></SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
            ) : filteredPatients.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">{t("dashboard.noPatients")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("patients.name")}</TableHead>
                    <TableHead>{t("patients.ageGender")}</TableHead>
                    <TableHead>{t("patients.organ")}</TableHead>
                    <TableHead>{t("patients.transplantDate")}</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patient/${p.id}`)}>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{getAge(p.date_of_birth)}/{p.gender ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{p.organ_type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{p.transplant_date ?? "—"}</TableCell>
                      <TableCell>{getRiskBadge(p.risk_level)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
