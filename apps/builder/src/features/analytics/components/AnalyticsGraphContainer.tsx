import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { isDefined } from "@typebot.io/lib/utils";
import type { Stats } from "@typebot.io/results/schemas/answers";
import type { TimeFilter } from "@typebot.io/results/timeFilter";
import { useOpenControls } from "@typebot.io/ui/hooks/useOpenControls";
import { LoaderCircleIcon } from "@typebot.io/ui/icons/LoaderCircleIcon";
import { useMemo, useRef } from "react";
import { ChangePlanDialog } from "@/features/billing/components/ChangePlanDialog";
import { useTypebot } from "@/features/editor/providers/TypebotProvider";
import { Graph } from "@/features/graph/components/Graph";
import { GraphProvider } from "@/features/graph/providers/GraphProvider";
import { orpc } from "@/lib/queryClient";
import { populateEdgesWithTotalVisits } from "../helpers/populateEdgesWithTotalVisits";
import { StatsCards } from "./StatsCards";

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

type Props = {
  timeFilter: TimeFilter;
  onTimeFilterChange: (timeFilter: TimeFilter) => void;
  stats?: Stats;
};

export const AnalyticsGraphContainer = ({
  timeFilter,
  onTimeFilterChange,
  stats,
}: Props) => {
  const analyticsContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslate();
  const { isOpen, onOpen, onClose } = useOpenControls();
  const { typebot, publishedTypebot } = useTypebot();
  const { data } = useQuery(
    orpc.analytics.getInDepthAnalyticsData.queryOptions({
      input: {
        typebotId: typebot?.id ?? "",
        timeFilter,
        timeZone,
      },
      enabled: isDefined(typebot?.id) && isDefined(publishedTypebot),
    }),
  );

  const edgesWithTotalUsers = useMemo(() => {
    if (
      !publishedTypebot?.edges ||
      !publishedTypebot.groups ||
      !publishedTypebot.events ||
      !data?.totalAnswers ||
      !stats?.totalViews
    )
      return;
    const firstEdgeId = publishedTypebot.events[0].outgoingEdgeId;
    if (!firstEdgeId) return;
    return populateEdgesWithTotalVisits({
      initialEdge: {
        id: firstEdgeId,
        total: stats.totalViews,
      },
      offDefaultPathEdgeWithTotalVisits: data.offDefaultPathVisitedEdges,
      edges: publishedTypebot.edges,
      groups: publishedTypebot.groups,
      totalAnswers: data.totalAnswers,
      // logger: console.log,
    });
  }, [
    data?.offDefaultPathVisitedEdges,
    data?.totalAnswers,
    publishedTypebot?.edges,
    publishedTypebot?.groups,
    publishedTypebot?.events,
    stats?.totalViews,
  ]);

  return (
    <div
      className="flex w-full relative h-full justify-center overflow-clip bg-gray-3 dark:bg-gray-2 [background-image:radial-gradient(var(--gray-7)_1px,transparent_0)] dark:[background-image:radial-gradient(var(--gray-5)_1px,transparent_0)] [background-size:40px_40px] [background-position:-19px_-19px]"
      ref={analyticsContainerRef}
    >
      {publishedTypebot && stats ? (
        <GraphProvider isReadOnly isAnalytics>
          <Graph
            className="flex-1"
            editorContainerRef={analyticsContainerRef}
            typebot={publishedTypebot}
            onUnlockProPlanClick={onOpen}
            totalAnswers={data?.totalAnswers}
            edgesWithTotalUsers={edgesWithTotalUsers}
          />
        </GraphProvider>
      ) : (
        <div className="flex justify-center items-center size-full bg-white/50">
          <LoaderCircleIcon className="animate-spin" />
        </div>
      )}
      <ChangePlanDialog
        onClose={onClose}
        isOpen={isOpen}
        type={t("billing.limitMessage.analytics")}
        excludedPlans={["STARTER"]}
      />
      <StatsCards
        stats={stats}
        className="absolute top-4"
        timeFilter={timeFilter}
        onTimeFilterChange={onTimeFilterChange}
      />
    </div>
  );
};
