import math
R={1:((-48.2951743,-18.9141383),(-48.2974234,-18.9147840)),2:((-48.2957077,-18.9133421),(-48.2951642,-18.9150619)),3:((-48.2954007,-18.9151250),(-48.2959344,-18.9134378)),4:((-48.2956355,-18.9152038),(-48.2961780,-18.9134932)),5:((-48.2964380,-18.9135758),(-48.2959100,-18.9152728)),6:((-48.2961558,-18.9153542),(-48.2967041,-18.9136340)),7:((-48.2969342,-18.9136793),(-48.2963870,-18.9154050)),8:((-48.2966258,-18.9154891),(-48.2971672,-18.9137671)),9:((-48.2968414,-18.9155518),(-48.2974017,-18.9138390)),10:((-48.2971017,-18.9156315),(-48.2976462,-18.9138993)),11:((-48.2973164,-18.9154439),(-48.2950051,-18.9147816)),12:((-48.2973909,-18.9152083),(-48.2950918,-18.9145361)),13:((-48.2951782,-18.9142923),(-48.2974729,-18.9149645)),14:((-48.2975673,-18.9146675),(-48.2952533,-18.9140022)),15:((-48.2976510,-18.9144243),(-48.2953260,-18.9137671)),16:((-48.2954205,-18.9135337),(-48.2977333,-18.9141798))}
def inter(a,b):
    (x1,y1),(x2,y2)=R[a];(x3,y3),(x4,y4)=R[b]
    d=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4)
    t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/d
    return (x1+t*(x2-x1),y1+t*(y2-y1))
V=[11,12,13,1,14,15,16]; H=[10,9,8,7,6,5,4,3,2]
for h in H: print(h,[tuple(round(c,7) for c in inter(h,v)) for v in (1,14)])
print('Q56 corners (rua5/4 x rua1/14):')
for p in [inter(5,1),inter(5,14),inter(4,14),inter(4,1)]: print(round(p[0],7),round(p[1],7))
m=111320
def d(a,b): return math.hypot((a[0]-b[0])*m*math.cos(math.radians(18.9)),(a[1]-b[1])*m)
print('lado h',d(inter(5,1),inter(5,14)),'lado v',d(inter(5,1),inter(4,1)))

print('=====SQL')
Hl=[10,9,8,7,6,5,4,3,2]; Vl=[11,12,13,1,14,15,16]
P=[[None]*9 for _ in range(11)]
for i,h in enumerate(Hl,1):
    for j,v in enumerate(Vl,1): P[i][j]=inter(h,v)
def ext(a,b,k): return (a[0]+k*(a[0]-b[0]),a[1]+k*(a[1]-b[1]))
for i in range(1,10):
    P[i][0]=ext(P[i][1],P[i][2],1.1); P[i][8]=ext(P[i][7],P[i][6],1.15)
for j in range(0,9):
    P[0][j]=ext(P[1][j],P[2][j],0.65); P[10][j]=ext(P[9][j],P[8][j],1.1)
G={1:[81,79,77,68,69,76,78,80],2:[73,75,71,64,67,70,72,74],3:[47,45,43,66,65,44,46,48],4:[41,39,37,63,62,38,40,42],5:[35,33,31,61,60,32,34,None],7:[23,21,19,55,None,20,22,24],8:[17,15,13,53,54,14,16,18],9:[11,9,7,51,52,8,10,12],10:[5,3,None,49,50,2,4,6]}
vals=[]
for r,row in G.items():
    for c,n in enumerate(row,1):
        if n is None: continue
        pts=[P[r-1][c-1],P[r-1][c],P[r][c],P[r][c-1]]
        pts.append(pts[0])
        cx=sum(p[0] for p in pts[:4])/4; cy=sum(p[1] for p in pts[:4])/4
        coords=','.join('[%.7f,%.7f]'%p for p in pts)
        vals.append("(%d,'{\"type\":\"Polygon\",\"coordinates\":[[%s]]}'::jsonb,%.7f,%.7f)"%(n,coords,cy,cx))
print(len(vals))
print("insert into quadras (cemiterio_id,numero,nome,poligono,centro_latitude,centro_longitude,numeracao_origem,situacao,observacoes) select c.id,v.n,'QUADRA '||v.n,v.p,v.lat,v.lng,'manual','ativa','Gerada da grade de ruas + mapa impresso da prefeitura (2026-10-21). Aguarda conferência visual.' from cemiterios c, (values "+",".join(vals)+") as v(n,p,lat,lng) where c.slug='cemiterio-sao-pedro' returning numero;")
