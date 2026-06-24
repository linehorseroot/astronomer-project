"use client";

/** Typed hooks over the data adapter. Components use these, never the adapter directly. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdapter } from "@/lib/adapters";
import type { RerunRequest, Workflow } from "@/lib/contract";
import { qk } from "./keys";

export function useTemplates() {
  return useQuery({ queryKey: qk.templates, queryFn: () => getAdapter().listTemplates() });
}

export function useTemplate(key: string) {
  return useQuery({ queryKey: qk.template(key), queryFn: () => getAdapter().getTemplate(key) });
}

export function useWorkflows() {
  return useQuery({ queryKey: qk.workflows, queryFn: () => getAdapter().listWorkflows() });
}

export function useWorkflow(id: string) {
  return useQuery({ queryKey: qk.workflow(id), queryFn: () => getAdapter().getWorkflow(id) });
}

export function useSaveWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (wf: Workflow) => getAdapter().saveWorkflow(wf),
    onSuccess: (wf) => {
      qc.invalidateQueries({ queryKey: qk.workflows });
      qc.invalidateQueries({ queryKey: qk.workflow(wf.id) });
    },
  });
}

export function useSchedules(workflowId: string) {
  return useQuery({
    queryKey: qk.schedules(workflowId),
    queryFn: () => getAdapter().listSchedules(workflowId),
  });
}

export function useRuns() {
  return useQuery({ queryKey: qk.runs, queryFn: () => getAdapter().listRuns() });
}

export function useRun(executionId: string) {
  return useQuery({ queryKey: qk.run(executionId), queryFn: () => getAdapter().getRun(executionId) });
}

export function useRerun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: RerunRequest) => getAdapter().rerun(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.runs }),
  });
}
