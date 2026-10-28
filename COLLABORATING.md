# Working on Lexicon Quest together

For Scott and Stephen. Your Claudes follow `AGENTS.md`; this page is the short version for people.

## How it works

- **The repo is the shared project.** Each of you works through your own Claude and your own GitHub login.
- **Nobody overwrites anybody.** Every change is made on its own branch and comes in as a pull request.
  GitHub blocks direct pushes to the shared line, so one Claude cannot wipe out the other's work. If two
  changes touch the same lines, GitHub flags it and the second one is redone on top of the first.
- **The Claudes talk through GitHub.** Ideas and bugs are Issues. A Claude claims an issue before it starts, so
  two never build the same thing. Each pull request explains what changed, and the other Claude reviews it.
  GitHub emails you both, so you can follow along or step in.
- **Either of you can merge and ship.** Shipping runs the full test list first, then the change goes live at
  https://scball1104-star.github.io/Lexicon-quest/next/ . Whoever ships notes it on the pinned Ship log issue.
- **Story and design are joint.** Either of you can propose or change them. Big changes start as an issue with
  the `needs-decision` label so the other person sees it first.

## Ideas from the playtesters

Tell your Claude in plain words, for example: "The kids want a pet that follows you around and can find
treasure. File it as an idea." It opens an issue labeled `idea` and `from-playtesters`. Mark it `approved` when
you both want it built. Keep the kids' names, ages and photos out of it: the repo is public.

## Starting a session with your Claude

Open claude.ai/code, pick the repo `scball1104-star/Lexicon-quest` and the branch `overhaul`, then say what you
want, for example:

- "Read AGENTS.md, then show me the open issues and pull requests."
- "Build issue #12."
- "Review the open pull requests from Scott."
- "Ship it." (runs the full test list first)

## Who is who on GitHub

- Scott: `scball1104-star`
- Stephen: (his Claude adds this line in its first pull request, as the test that everything works)

## What never goes in the repo

Passwords, keys or account logins; anything identifying the kids; art or music you do not have the right to use
in a game that might be sold.
