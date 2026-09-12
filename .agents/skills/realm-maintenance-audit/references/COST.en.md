# COST Optimizes Software Trajectory

Preserve required semantics. Optimize expected total cost across the software trajectory.

## General Provisions

Engineering decisions shall optimize expected total cost while satisfying correctness, required semantics, security, maintainability, and other established constraints.

**Total cost** means the aggregate engineering burden that a decision imposes on the project over its expected period of relevance, including direct or continuing costs such as time, Tokens and context, compute resources, implementation and verification, understanding and maintenance, rework and migration, operation and failure handling.

Total cost shall be evaluated against the approved development direction and the reasonably foreseeable scope of use. Current investment shall not be justified by future possibilities that are not yet established or are indefinitely remote.

The cheapest current step, the least code, the fewest files, or immediate consumption does not necessarily mean the lowest total cost.

## Justified Expansion

Engineering may expand, but the scope and burden of that expansion shall be proportionate to the responsibility assumed, the problem solved, and the expected benefit.

Scale, degree of abstraction, degree of generality, dependency count, file count, package count, process count, and current consumer count shall not, individually, be used as grounds for judging engineering excess.

A larger abstraction may be preferable to multiple local mechanisms. An abstraction that unifies responsibility ownership, eliminates repeated reasoning, isolates volatile mechanics, preserves established boundaries, or materially reduces later development cost shall not be rejected merely because its scope is larger.

The smallest implementation shall not be preferred merely because it is smaller.

An established architecture or development direction may provide sufficient justification for a structure before its first consumer exists. Hypothetical future use alone is insufficient to justify substantial machinery.

## Reuse and Automation

Generic mechanics shall preferentially use an existing semantic owner, project primitive, standard library, runtime, operating-system capability, protocol implementation, or mature dependency when doing so reduces total cost, provided that required semantics and authority boundaries are not surrendered.

Owning product semantics does not require the project to reimplement generic infrastructure. A lower dependency count is not, by itself, a quality metric.

Mature tooling shall be adopted proactively when, at low continuing cost, it can eliminate repeated operations, repeated judgment, formatting drift, avoidable defects, verification noise, or repeated commands.

High-cost manual work shall not be retained merely to avoid adding tooling.

## Architectural Continuity and History

Architecture shall be judged against the approved development direction as a whole and shall not be optimized only for the current task.

Established abstractions and semantic boundaries shall not be flattened, duplicated, bypassed, or localized merely because the current task can be completed with fewer files, fewer layers, or less indirection.

Existing code, architecture, tests, documentation, and processes have no automatic preservation privilege. They may be directly rewritten, replaced, or deleted when correctness, semantics, established evolution, risk, or total cost justifies the change.

Development history alone creates no compatibility obligation. Compatibility mechanisms shall correspond to real current obligations.

Historical failures may serve as evidence for automation, tests, or protective mechanisms; permanent retention shall depend on whether the risk remains and whether continuing benefits are sufficient to cover continuing costs.

## Process Discipline

Development process is engineering machinery and shall be subject to the same cost judgment as code.

Plans, ADRs, gates, matrices, qualification systems, mandatory TDD stages, review stages, evidence packages, checklists, stabilization phases, and closure procedures shall exist only when the uncertainty, coordination cost, risk, or rework they continuously reduce is sufficient to cover their own burden.

Organizational convention, professional appearance, and formal completeness do not constitute independent reasons for process.

A single event shall not automatically be institutionalized as a permanent process.

## Failure Handling and Testing

Failure handling shall match the guarantees and risks the system actually bears.

Restart, retry, reset, operator intervention, explicit failure, or stronger recovery mechanisms may each be valid under the applicable conditions. Additional recovery layers shall not be added merely because a deeper failure can be imagined.

Tests shall protect meaningful contracts, observed risks, or uncertainty with informational value. TDD is optional.

A failing test shall not be created merely to prove that functionality not yet implemented is absent; production architecture shall not be created merely for testing convenience.

## Verification

Verification shall reduce time, compute resources, context pollution, and repeated reading cost while preserving the required level of confidence.

During iteration, the narrowest check capable of falsifying the current change shall be run. The full verification suite shall not be rerun after every small change unless the failure can only be reproduced at a broader scope.

After broad verification exposes a clearly scoped failure, repairs shall be concentrated within the corresponding narrow scope, and comprehensive verification shall resume after that scope is stable.

Repeatedly slow, noisy, redundant, or poorly scoped verification is itself an engineering problem.

Verification tooling is ordinary engineering. Refactoring, extending, or creating verification tooling is justified whenever its continuing benefit is sufficient to cover its maintenance burden.

Verification output shall prioritize concise, deterministic, non-interactive, high-information-density diagnostics. Unnecessary ANSI color, progress animation, watch-mode noise, repeated stack traces, duplicate failures, and redundant success output shall be removed; complete logs may be retained as needed.

## Execution Authority

The Executor shall implement decided semantics, ownership, boundaries, provider choices, compatibility obligations, security constraints, and failure policies while retaining ordinary implementation judgment.

Material unresolved issues shall be escalated. Unresolved decisions shall not be concealed through new abstractions, configuration options, registries, fallbacks, policy layers, or generic frameworks.

Approved capabilities shall be implemented completely. Requirements shall not be weakened, and incomplete behavior shall not be delivered, merely to reduce cost.

## Writing

Documentation and user-facing text shall use necessary and sufficient wording to express the required meaning directly.

Constructing a possible misunderstanding and then denying it shall not be used as the default mode of expression. Negative contrasts such as “not X, but Y” or “this does not mean” shall be used only when the distinction materially affects understanding.

Primary interface copy shall serve the user's current task. Internal provenance defense, methodological self-justification, implementation-detail disclaimers, and anticipatory rebuttals shall not enter primary copy unless they genuinely affect safety, operation, or interpretation of results.

Limitations, uncertainty, and provenance information shall, when needed, be stated directly and once, and placed at the appropriate information level.

Conciseness means removing repetition and irrelevant content; it does not mean removing information necessary for correct understanding.

## Cost Judgment and Completion

When adding, expanding, retaining, replacing, or deleting non-trivial code structures, abstractions, dependencies, tools, tests, verification mechanisms, documents, gates, workflows, or processes, the following shall be judged:

> Among feasible options that satisfy the established constraints, are the responsibility assumed by this option and its continuing value sufficient to justify its expected total cost?

Where multiple feasible options exist, the option with lower expected total cost and less long-term repeated burden shall be preferred.

“Proportionate” does not mean smaller, fewer, less abstract, or immediately consumed; it means that continuing value and continuing burden stand in a reasonable proportion.

Before claiming that work is complete, the original objective, authorized scope, and required proof shall be reread. Completion shall not be judged from memory alone.

Once all authorized behavior and required proof have been confirmed complete, work shall stop. Further work shall be triggered only by a new defect, requirement, accepted improvement, or explicit authorization.
