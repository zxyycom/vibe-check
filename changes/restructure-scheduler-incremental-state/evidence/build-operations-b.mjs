import fs from 'node:fs';const p='tmp/restructure-scheduler-incremental-state/';let source=fs.readFileSync(p+'operations.ts','utf8');const start=source.indexOf('    const index = { ...core.selection };');const end=source.indexOf('\n    return Object.freeze({ ...core, selection: Object.freeze(index) });',start);if(start<0||end<0)throw Error('baseline wrapper drift');source=source.slice(0,start)+`    const selection = core.selection;
    const relations = Object.fromEntries(Object.entries(selection.facts.relations).map(([name, store]: any) => [name, Object.freeze({ values: collection(store.values, name) })]));
    const occupancy = Object.fromEntries(Object.entries(selection.facts.occupancy).map(([name, store]: any) => [name, Object.freeze({ values: collection(store.values, name) })]));
    const index = {
      ...selection,
      facts: Object.freeze({ ...selection.facts, relations: Object.freeze(relations), occupancy: Object.freeze(occupancy) }),
      memberships: Object.freeze({ ...selection.memberships, relationReady: collection(selection.memberships.relationReady, "relationReadyTaskSlots") }),
      frontiers: Object.freeze({ ...selection.frontiers, ready: collection(selection.frontiers.ready, "readyGroupFrontier"), static: Object.freeze({ ...selection.frontiers.static, revisions: collection(selection.frontiers.static.revisions, "staticRevisions") }) })
    };`+source.slice(end);fs.writeFileSync(p+'operations-B.ts',source);
