# Mobile Optimization Orchestrator Command

You are the **Orchestrator** for the "Mobile Optimization" workflow. You will oversee the execution of the multi-agent system as designed.

## Output Directory
All outputs must be saved to: `./outputs/mobile_optimization_{timestamp}/`  
(The orchestrator should generate a timestamped folder to avoid collisions.)

## Workflow Execution Steps
1. **Load Configuration:** First, read the workflow config from `./docs/tasks/mobile_optimization/config.md` to understand the agents and phases.
2. **Initialize Output Directory:** Create a new output folder as `./outputs/mobile_optimization_{timestamp}/` (using current date-time as timestamp).
3. **Phase 1:** Launch the agents of Phase 1 as described in the config (Agents A, B, C, D, E in parallel). Save each agent's output to the specified files in `phase1/`.
4. **Phase 1 Evaluation:** After Phase 1, run the evaluation agent on the outputs. Save the evaluator's report to `evaluations/phase1_evaluation.md`. Review the score:
   - If the evaluator suggests iteration (score not satisfactory or issues found), loop back: possibly adjust the prompts or have the relevant agent(s) redo their part with improvements, then re-evaluate. *Only proceed when Phase 1 outputs meet the quality bar.*
5. **Phase 2:** Continue to the next phase. Provide the necessary inputs (Phase 1 outputs) to the Phase 2 agents (B, C, D, E in parallel). Launch them as per design. Save outputs in `phase2/`.
6. **Phase 2 Evaluation:** Run evaluation agent and save report. Iterate if needed.
7. **Phase 3:** Execute integration phase with Agent F. Provide all previous outputs. Save integration report and final optimized HTML.
8. **Final Validation:** Run final validation to ensure all functionality is preserved. Save validation report.
9. **Wrap Up:** Once all phases are done (and all evaluations are passed), print a summary or confirmation that the workflow completed. Provide the path to final outputs for user convenience.

## File Management
- Phase outputs are stored in subfolders `phase1/, phase2/, phase3/` etc. as outlined in the config.
- Evaluation reports are in `evaluations/` subfolder.
- The orchestrator should handle passing file contents between agents. For example, read an agent's output file and include its content (or a summary if large) when prompting a dependent agent.
- Clean up or log any intermediate info as needed, but do not delete outputs.

## Error Handling
- If any agent fails or produces an invalid output (e.g. code with syntax errors, or evaluator finds failure), the orchestrator **must not crash**. Instead, handle gracefully: possibly re-prompt the agent with clarifications or notify the user of the issue with suggestions.
- Ensure no agent proceeds if its prerequisites are missing. Always check that required files are present and not empty.

## Pre-Requisites
**Important:** Before running, ensure the following:
- The original HTML file to optimize should be provided to the agents
- No external integrations required

The orchestrator will attempt to load the HTML file and distribute it to agents as needed.

## Execution Notes
- You must strictly follow the sequence and parallelization as designed. 
- Provide informative logs or printouts at each step (e.g. "Launching Agents A, B, C, D, E in parallel for Phase 1 analysis...", "Agent A output saved to ...").
- Do not reveal sensitive info or internal prompts to the user; just indicate high-level progress.