"""Build animated citizen walk sprites from the project's original interior character art.
Keeps source provenance within the game; no external fonts or stock art.
"""
from PIL import Image, ImageEnhance
from pathlib import Path
root=Path(__file__).resolve().parents[1]
src=Image.open(root/'assets/art/interior-sprites.png').convert('RGBA')
order=[1,4,0,2,3,5,7,6]  # baker, courier, gardener, smith, scholar, sailor, guard, child
FW,FH=56,66
atlas=Image.new('RGBA',(len(order)*3*FW,FH),(0,0,0,0))
for i,k in enumerate(order):
    gx,gy=(k%4)*256,(k//4)*256
    cell=src.crop((gx,gy,gx+256,gy+256))
    # Remove edge ghosts from the atlas where sprites meet adjacent cells.
    alpha=cell.getchannel('A')
    bound=alpha.getbbox()
    if not bound: continue
    x0,y0,x1,y1=bound
    cell=cell.crop((max(0,x0),max(0,y0),min(256,x1),min(256,y1)))
    cell.thumbnail((48,60),Image.Resampling.LANCZOS)
    for frame in range(3):
        canvas=Image.new('RGBA',(FW,FH),(0,0,0,0))
        # Walking cycle: asymmetric lean, foot displacement, subtle vertical rise.
        dx=(-1,0,1)[frame]
        dy=(1,-1,1)[frame]
        cx=(FW-cell.width)//2+dx
        cy=FH-cell.height-3+dy
        canvas.alpha_composite(cell,(cx,cy))
        if frame in (0,2):
            # Slight foot shift visible at full canvas resolution.
            feet=canvas.crop((8,FH-12,FW-8,FH-3))
            canvas.paste((0,0,0,0),(8,FH-12,FW-8,FH-3))
            canvas.alpha_composite(feet,(8+(1 if frame==2 else -1),FH-12))
        atlas.alpha_composite(canvas,(i*FW*3+frame*FW,0))
out=root/'assets/art/townsfolk-sprites.png'
atlas.save(out,optimize=True)
print(out, atlas.size, out.stat().st_size)
