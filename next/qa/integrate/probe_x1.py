"""Dev probe: load a save with the expansion on, build the completionist route object and run a few lines of Python against it.

    python qa/integrate/probe_x1.py <save.json> "<python statements using r (the route) and b (the bot)>"
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import autoplay as ap  # noqa: E402
import autoplay_x1  # noqa: E402


def main(save, code, device='desktop'):
    bot = ap.Bot(device, speed=2, resume=save, tag='-probe', x1=True)
    try:
        bot.open()
        Route = autoplay_x1.build(ap)
        r = Route(bot, phases=[], resumed=True)
        r.title_to_bed()
        bot.resume = None
        r.ensure_any()
        b = bot
        exec(code, {'r': r, 'b': b, 'ap': ap, 'Fail': ap.Fail})
        bot.check_errors()
    except Exception:
        import traceback
        traceback.print_exc()
        try:
            bot.shot('probe-fail')
        except Exception:
            pass
    finally:
        print('flags', sorted(k for k, v in (bot.flags() or {}).items() if v)[-12:])
        try:
            g = bot.game()
            print('map', g['map'], g['pos'], 'Lv', g['party'][0]['level'])
        except Exception:
            pass
        bot.close()


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'desktop')
