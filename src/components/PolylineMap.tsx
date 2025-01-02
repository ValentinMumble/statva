import {MapContainer, Polyline, TileLayer} from 'react-leaflet';
import {decodePolyline} from '../models';

const POLYLINE =
  'cbc_HjguHi@xEAr@pEbENYDw@WuGAyCLaAdBKhFdAhAAK]{BsA{A{Ac@}A[c@q@i@}AWOV_@hDIbBw@JQd@QjCo@dFJZhE~DPGBqAYwG?uDB]PQjBAbFdAtO|BtCt@INsAHEvEmBZIf@FjBPj@lBLhB]^FXdCZ~@@hHON{Cd@gBOyDb@kEIs@NJvFCVa@\\MZK~HUdEHd@fFp@hAt@\\v@h@h@UrD|E@vAkDdAuG[Ok@\\k@FqAe@_Al@]??MVEHWMqAFoAj@HJE@Sq@}@IWr@M`Al@h@i@t@UhBx@b@Cl@qB`CsKRgC[_KyAkNJw@`Ak@cB`Ao@Hc@MkBmD_BoHd@{Ah@gASsBJoB?mBRy@PHv@~At@LHALo@bAK`@}@NG@NeBlGn@n@P`Ep@G@y@FMXlAVVLc@Im@Vy@EWmAYOQJkGKmATgAoAZSw@eA[IQn@}GJQbAOAc@u@oEaBeGU_Bg@uAeA{B_AkAO@_@x@I@_B_By@bABV|D~FEt@s@|@Mf@HxATjAlAXn@f@LX`@bC~@?Vd@G^eBz@INl@jGI`AmAx@kDbBMRfAvC\\rDBxAe@pE@r@RtACh@o@HmBUqGoAqAwAmDoCu@yBiAs@}AWQH_@nFD`@PLtIfApFjApFf@zEx@f@\\MVwANEpEoAB]RC^J`CPXv@Gv@ThB_@\\FVfCZz@?jHQTsC`@kBKsD^_G?I^DhFi@~@I`IWnD?j@JRnFr@z@n@d@|@f@d@QvDbAFvCMrAqDhAiG[EsAX{Ac@{@l@]?VYFYGuAJeAh@HJMESw@w@E]x@C|@h@r@q@h@OfBx@d@DpDkOPiCS}I}AaONaAx@g@cB`Ay@D]OcBwC}AoH@a@ZiAj@eAQeCX_GNE|@dB|@JHIFe@bAMn@gA@XeBrGp@b@R`El@C@kANTRdAZJHYGw@ZkAKOqAQQWRaGKgANsAW?s@^S{@qAc@n@cHPUdASyAwHkAwDUiBsB}E_Ay@g@`AK?}AcBOJa@bA|@dB|BhDCr@u@~@Mj@^`DHJ|@Hv@f@f@vCNLx@ETr@Ub@oA^UVn@tF?x@IZ{F|CQX~@jCr@`FA~A_@|DHpCSNeAEiEk@oCs@eBeB}C}B}@aCmAs@oAOIPe@fGMLYC~AL';

const PolylineMap = () => {
  const decodedPolyline = decodePolyline(POLYLINE);

  return (
    <MapContainer
      //@ts-ignore
      center={decodedPolyline[0]}
      zoom={13}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline
        //@ts-ignore
        positions={decodedPolyline}
      />
    </MapContainer>
  );
};

export {PolylineMap};
