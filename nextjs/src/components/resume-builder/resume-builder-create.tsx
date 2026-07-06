"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/phone";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


interface Template { id: string; name: string; slug: string; description: string | null; }

interface WorkExp {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

interface ResumeData {
  title: string;
  phone: string;
  address: string;
  linkedin: string;
  website: string;
  summary: string;
  experience: WorkExp[];
  education: Education[];
  skills: string;
  certifications: string;
  languages: string;
}

function uid() { return Math.random().toString(36).slice(2); }

function emptyExp(): WorkExp {
  return { id: uid(), company: "", position: "", startDate: "", endDate: "", current: false, description: "" };
}
function emptyEdu(): Education {
  return { id: uid(), institution: "", degree: "", field: "", startDate: "", endDate: "", current: false };
}

interface Props {
  resumeId?: string;
}

export default function ResumeBuilderCreate({ resumeId }: Props) {
  const router = useRouter();
  const isEdit = !!resumeId;

  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(isEdit);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [templateId, setTemplateId] = React.useState("");
  const [data, setData] = React.useState<ResumeData>({
    title: "", phone: "", address: "", linkedin: "", website: "",
    summary: "", experience: [emptyExp()], education: [emptyEdu()],
    skills: "", certifications: "", languages: "",
  });

  React.useEffect(() => {
    fetch("/api/resume-builder/templates").then(r => r.json()).then(j => setTemplates(j.data ?? []));
    if (isEdit && resumeId) {
      setLoading(true);
      fetch(`/api/resume-builder/resumes/${resumeId}`)
        .then(r => r.json())
        .then(j => {
          const d = j.data;
          if (!d) return;
          setName(d.name ?? "");
          setEmail(d.email ?? "");
          setTemplateId(d.templateId ?? "");
          if (d.data && typeof d.data === "object") {
            setData({
              title: d.data.title ?? "",
              phone: d.data.phone ?? "",
              address: d.data.address ?? "",
              linkedin: d.data.linkedin ?? "",
              website: d.data.website ?? "",
              summary: d.data.summary ?? "",
              experience: d.data.experience?.length ? d.data.experience : [emptyExp()],
              education: d.data.education?.length ? d.data.education : [emptyEdu()],
              skills: d.data.skills ?? "",
              certifications: d.data.certifications ?? "",
              languages: d.data.languages ?? "",
            });
          }
        })
        .catch(() => toast.error(t("Failed to load resume")))
        .finally(() => setLoading(false));
    }
  }, [resumeId, isEdit]);

  function updateData<K extends keyof ResumeData>(key: K, val: ResumeData[K]) {
    setData(prev => ({ ...prev, [key]: val }));
  }

  function addExp() { updateData("experience", [...data.experience, emptyExp()]); }
  function removeExp(id: string) { updateData("experience", data.experience.filter(e => e.id !== id)); }
  function updateExp(id: string, updates: Partial<WorkExp>) {
    updateData("experience", data.experience.map(e => e.id === id ? { ...e, ...updates } : e));
  }

  function addEdu() { updateData("education", [...data.education, emptyEdu()]); }
  function removeEdu(id: string) { updateData("education", data.education.filter(e => e.id !== id)); }
  function updateEdu(id: string, updates: Partial<Education>) {
    updateData("education", data.education.map(e => e.id === id ? { ...e, ...updates } : e));
  }

  async function handleSave() {
    if (!name.trim()) { toast.error(t("Full name is required")); return; }
    if (!email.trim()) { toast.error(t("Email is required")); return; }
    if (!templateId) { toast.error(t("Please select a template")); return; }

    setSaving(true);
    try {
      const payload = { name: name.trim(), email: email.trim(), templateId, data };
      const res = isEdit
        ? await fetch(`/api/resume-builder/resumes/${resumeId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/resume-builder/resumes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error || t("Failed to save resume")); return; }
      toast.success(isEdit ? t("Resume updated!") : t("Resume created!"));
      if (!isEdit) router.push(`/resume-builder/resumes/${json.data.id}/edit`);
    } finally { setSaving(false); }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">{t("Loading...")}</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/resume-builder/resumes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />{t("Back to Resumes")}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[110px]">
          <Save className="h-4 w-4 mr-1.5" />{saving ? t("Saving...") : t("Save Resume")}
        </Button>
      </div>

      {/* Basic info */}
      <Card>
        <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-semibold">{t("Basic Information")}</CardTitle></CardHeader>
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>{t("Full Name")} <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Email")} <span className="text-red-500">*</span></Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Template")} <span className="text-red-500">*</span></Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder={t("Select template...")} /></SelectTrigger>
              <SelectContent>
                {templates.map(tpl => (
                  <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Personal details */}
      <Card>
        <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-semibold">{t("Personal Details")}</CardTitle></CardHeader>
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t("Job Title / Profession")}</Label>
            <Input value={data.title} onChange={e => updateData("title", e.target.value)} placeholder="Software Engineer" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Phone")}</Label>
            <Input
              value={data.phone}
              onChange={e => updateData("phone", formatPhone(e.target.value))}
              placeholder="(000) 000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Address")}</Label>
            <Input value={data.address} onChange={e => updateData("address", e.target.value)} placeholder="New York, USA" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("LinkedIn URL")}</Label>
            <Input value={data.linkedin} onChange={e => updateData("linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{t("Website / Portfolio")}</Label>
            <Input value={data.website} onChange={e => updateData("website", e.target.value)} placeholder="https://yourwebsite.com" />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-semibold">{t("Professional Summary")}</CardTitle></CardHeader>
        <CardContent className="p-5">
          <Textarea
            value={data.summary}
            onChange={e => updateData("summary", e.target.value)}
            placeholder={t("Write a brief professional summary...")}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Work Experience */}
      <Card>
        <CardHeader className="border-b py-3 px-5 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">{t("Work Experience")}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addExp}>
            <Plus className="h-3.5 w-3.5 mr-1" />{t("Add Experience")}
          </Button>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {data.experience.map((exp, idx) => (
            <div key={exp.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{t("Experience")} {idx + 1}</p>
                {data.experience.length > 1 && (
                  <button onClick={() => removeExp(exp.id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Company Name")}</Label>
                  <Input value={exp.company} onChange={e => updateExp(exp.id, { company: e.target.value })} placeholder="Acme Corp" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Position / Role")}</Label>
                  <Input value={exp.position} onChange={e => updateExp(exp.id, { position: e.target.value })} placeholder="Senior Developer" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Start Date")}</Label>
                  <Input type="month" value={exp.startDate} onChange={e => updateExp(exp.id, { startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("End Date")}</Label>
                  <Input type="month" value={exp.endDate} onChange={e => updateExp(exp.id, { endDate: e.target.value })} disabled={exp.current} />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={exp.current} onChange={e => updateExp(exp.id, { current: e.target.checked, endDate: "" })} />
                    {t("Currently working here")}
                  </label>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">{t("Description")}</Label>
                  <Textarea value={exp.description} onChange={e => updateExp(exp.id, { description: e.target.value })} placeholder={t("Describe your responsibilities and achievements...")} rows={3} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="border-b py-3 px-5 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">{t("Education")}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addEdu}>
            <Plus className="h-3.5 w-3.5 mr-1" />{t("Add Education")}
          </Button>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {data.education.map((edu, idx) => (
            <div key={edu.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{t("Education")} {idx + 1}</p>
                {data.education.length > 1 && (
                  <button onClick={() => removeEdu(edu.id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Institution")}</Label>
                  <Input value={edu.institution} onChange={e => updateEdu(edu.id, { institution: e.target.value })} placeholder="University of Example" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Degree")}</Label>
                  <Input value={edu.degree} onChange={e => updateEdu(edu.id, { degree: e.target.value })} placeholder="Bachelor of Science" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Field of Study")}</Label>
                  <Input value={edu.field} onChange={e => updateEdu(edu.id, { field: e.target.value })} placeholder="Computer Science" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Start Year")}</Label>
                  <Input type="month" value={edu.startDate} onChange={e => updateEdu(edu.id, { startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("End Year")}</Label>
                  <Input type="month" value={edu.endDate} onChange={e => updateEdu(edu.id, { endDate: e.target.value })} disabled={edu.current} />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={edu.current} onChange={e => updateEdu(edu.id, { current: e.target.checked, endDate: "" })} />
                    {t("Currently studying")}
                  </label>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Skills, Certs, Languages */}
      <Card>
        <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-semibold">{t("Skills & Additional Info")}</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>{t("Skills")}</Label>
            <Textarea value={data.skills} onChange={e => updateData("skills", e.target.value)} placeholder="JavaScript, React, Node.js, Python..." rows={3} />
            <p className="text-xs text-muted-foreground">{t("Separate skills with commas")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Certifications")}</Label>
            <Textarea value={data.certifications} onChange={e => updateData("certifications", e.target.value)} placeholder="AWS Certified Developer, Google Analytics..." rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Languages")}</Label>
            <Input value={data.languages} onChange={e => updateData("languages", e.target.value)} placeholder="English (Native), Spanish (Fluent)" />
          </div>
        </CardContent>
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-1.5" />{saving ? t("Saving...") : t("Save Resume")}
        </Button>
      </div>
    </div>
  );
}
