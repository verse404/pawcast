import { ImageSourcePropType, Platform } from 'react-native';
import { NATIVE_PARK_PHOTO_ASSETS } from './nativeParkPhotoAssets';

const SAFE_CURATED_ID_RE = /^[a-z0-9-]+$/;

/**
 * All 90 visually verified park, dog beach, and waterfront photo thumbnails
 * (30 Melbourne + 30 Sydney + 30 Shanghai) bundled in `public/park-thumbs/<id>.jpg`.
 */
export const CURATED_PARK_PHOTO_IDS: ReadonlySet<string> = new Set([
  'mel-brighton-beach',
  'mel-stkilda-west-beach',
  'mel-port-melbourne-beach',
  'mel-altona-dog-beach',
  'mel-mentone-dog-beach',
  'mel-tassells-cove',
  'mel-edinburgh-gardens',
  'mel-clayton-reserve',
  'mel-royal-park',
  'mel-yarra-bend',
  'mel-fawkner-park',
  'mel-albert-park',
  'mel-alma-park',
  'mel-citizens-barkly',
  'mel-caulfield-park',
  'mel-central-hedgeley',
  'mel-darebin-parklands',
  'mel-all-nations',
  'mel-gilpin-fenced',
  'mel-footscray-park',
  'mel-cruickshank',
  'mel-cyril-curtain',
  'mel-surrey-boxhill',
  'mel-ruffey-lake',
  'mel-westerfolds',
  'mel-jells-park',
  'mel-nortons-park',
  'mel-lilydale-lake',
  'mel-ballam-park',
  'mel-craigieburn-anzac',
  'syd-rose-bay-beach',
  'syd-sirius-cove',
  'syd-rowland-reserve',
  'syd-curl-curl-lagoon',
  'syd-greenhills-beach',
  'syd-silver-beach-kurnell',
  'syd-centennial-park',
  'syd-sydney-park',
  'syd-cafe-bones',
  'syd-glebe-foreshore',
  'syd-rushcutters-bay',
  'syd-marks-park',
  'syd-camperdown-memorial',
  'syd-callan-park',
  'syd-st-leonards-park',
  'syd-st-ives-dog-ring',
  'syd-manly-lagoon',
  'syd-morrison-bay',
  'syd-parramatta-park',
  'syd-dan-mahoney',
  'syd-crestwood-hills',
  'syd-bungarribee',
  'syd-bicentennial-olympic',
  'syd-steel-park-cooks',
  'syd-carss-bush-park',
  'syd-helena-st-kirrawee',
  'syd-shale-hills',
  'syd-jamison-penrith',
  'syd-milton-macarthur',
  'syd-barangaroo-headland',
  'sh-west-bund',
  'sh-expo-doggo',
  'sh-century-pet',
  'sh-heping-dog',
  'sh-gate-m',
  'sh-pengpu',
  'sh-dahuangcun',
  'sh-yanbei',
  'sh-langxiang',
  'sh-lets-dog',
  'sh-suhewan',
  'sh-butterfly-bay',
  'sh-sleepless',
  'sh-dongjiaojing',
  'sh-zhonghuan',
  'sh-nanyuan',
  'sh-daji',
  'sh-jingmi',
  'sh-runway-park',
  'sh-haisu',
  'sh-gubei',
  'sh-kunshan',
  'sh-hunan-loop',
  'sh-banma-suhe',
  'sh-qiantan',
  'sh-century-outer',
  'sh-minhang-river',
  'sh-xinjiangwan',
  'sh-panlong',
  'sh-fish-art',
]);

/** HTTPS remote fallback URLs for native iOS/Android clients outside static web hosting. */
export const REMOTE_HTTPS_PARK_PHOTOS: Readonly<Record<string, string>> = {
  'mel-brighton-beach': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Melbourne_Brighton_Beach_Huts-40_%288542743871%29.jpg/500px-Melbourne_Brighton_Beach_Huts-40_%288542743871%29.jpg',
  'mel-stkilda-west-beach': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/St_Kilda_Sunset_%28Explored%5E%29_-_Flickr_-_Scott_Cresswell.jpg/500px-St_Kilda_Sunset_%28Explored%5E%29_-_Flickr_-_Scott_Cresswell.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-port-melbourne-beach': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Melbourne_%28AU%29%2C_St_Kilda_Beach_--_2019_--_1590.jpg/500px-Melbourne_%28AU%29%2C_St_Kilda_Beach_--_2019_--_1590.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-altona-dog-beach': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Altona_Dog_Beach_-_Victoria%2C_Australia.jpg/500px-Altona_Dog_Beach_-_Victoria%2C_Australia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-mentone-dog-beach': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Mentone_Beach_2%2C_Mentone%2C_Vic%2C_jjron%2C_08.01.2014.jpg/500px-Mentone_Beach_2%2C_Mentone%2C_Vic%2C_jjron%2C_08.01.2014.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-tassells-cove': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Safety_Beach%2C_Victoria%2C_Australia.jpg/500px-Safety_Beach%2C_Victoria%2C_Australia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-edinburgh-gardens': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/Early_morning_run_in_the_fog%2C_Edinburgh_Gardens_-_Flickr_-_neonluxe.jpg/500px-Early_morning_run_in_the_fog%2C_Edinburgh_Gardens_-_Flickr_-_neonluxe.jpg',
  'mel-clayton-reserve': 'https://www.findadogpark.com.au/fadpimg/53247-01.webp',
  'mel-royal-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Royal_Park_Melbourne.jpg/500px-Royal_Park_Melbourne.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-yarra-bend': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/Studley_Park_Boathouse%2C_Melbourne%2C_Australia.jpg/500px-Studley_Park_Boathouse%2C_Melbourne%2C_Australia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-fawkner-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Fawkner_Park%2C_Melbourne.jpg/500px-Fawkner_Park%2C_Melbourne.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-albert-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Albert_Park_and_Lake_seen_from_Carousel_venue%2C_Melbourne.jpg/500px-Albert_Park_and_Lake_seen_from_Carousel_venue%2C_Melbourne.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-alma-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Rotunda_alma_park.jpg/500px-Rotunda_alma_park.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-citizens-barkly': 'https://www.findadogpark.com.au/fadpimg/55705-01.webp',
  'mel-caulfield-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Caulfield_Park_2026_12.jpg/500px-Caulfield_Park_2026_12.jpg',
  'mel-central-hedgeley': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Hedgeley_Dene_Gardens_Mel_1a.jpg/500px-Hedgeley_Dene_Gardens_Mel_1a.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-darebin-parklands': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Darebin_Creek.JPG/500px-Darebin_Creek.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'mel-all-nations': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Northcote_Plaza_with_All_Nations_Park_in_the_foreground.png/500px-Northcote_Plaza_with_All_Nations_Park_in_the_foreground.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-gilpin-fenced': 'https://theyappack.com.au/wp-content/uploads/2023/10/brunswick-fenced-dog-park-768x512.jpg',
  'mel-footscray-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Footscray_Park.jpg/500px-Footscray_Park.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-cruickshank': 'https://www.findadogpark.com.au/fadpimg/54261-01.webp',
  'mel-cyril-curtain': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Willie_botanic_garden_gates.jpg/500px-Willie_botanic_garden_gates.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-surrey-boxhill': 'https://upload.wikimedia.org/wikipedia/commons/d/d1/2025-12-27_Box_Hill_Gardens_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled',
  'mel-ruffey-lake': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Ruffey_Lake_Park.JPG/500px-Ruffey_Lake_Park.JPG',
  'mel-westerfolds': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Yarra_River_from_footbridge_in_Westerfolds_Park_in_Templestowe%2C_Melbourne.jpg/500px-Yarra_River_from_footbridge_in_Westerfolds_Park_in_Templestowe%2C_Melbourne.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-jells-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Jells_Park_1.JPG/500px-Jells_Park_1.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-nortons-park': 'https://thumb.wikimedia.org/wikipedia/en/thumb/9/96/Dandenong_creek_and_pedestrian_bridge_at_Dandenong_Park.png/500px-Dandenong_creek_and_pedestrian_bridge_at_Dandenong_Park.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'mel-lilydale-lake': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Lillydale_Lake-North.jpg/500px-Lillydale_Lake-North.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'mel-ballam-park': 'https://theyappack.com.au/wp-content/uploads/2023/07/ballam-park-dog-agility-park-2-768x432.jpg',
  'mel-craigieburn-anzac': 'https://www.melbourneplaygrounds.com.au/images/anzac-park-play-space-central-park-avenue-craigieburn.jpg',
  'syd-rose-bay-beach': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/AUS_Sydney%2C_Woollahra%2C_Rose_Bay_Beach_002.jpg/500px-AUS_Sydney%2C_Woollahra%2C_Rose_Bay_Beach_002.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-sirius-cove': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/%281%29Little_Sirius_Cove-1.jpg/500px-%281%29Little_Sirius_Cove-1.jpg',
  'syd-rowland-reserve': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/BayviewNSW.JPG/500px-BayviewNSW.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'syd-curl-curl-lagoon': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Curl_Curl_Lagoon_05.jpg/500px-Curl_Curl_Lagoon_05.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-greenhills-beach': 'https://www.travelnuity.com/wp-content/uploads/2020/08/Dogs-at-Greenhills-Beach-640x640.jpg',
  'syd-silver-beach-kurnell': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Silver_beach.jpg/500px-Silver_beach.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-centennial-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Centennial_Park_people_001.jpg/500px-Centennial_Park_people_001.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-sydney-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Wetland_area_in_Sydney_Park_April_2026.jpg/500px-Wetland_area_in_Sydney_Park_April_2026.jpg',
  'syd-cafe-bones': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Hawthorne_Canal_looking_downstream_at_Haberfield_NSW.JPG/500px-Hawthorne_Canal_looking_downstream_at_Haberfield_NSW.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'syd-glebe-foreshore': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Bicentennial_Park_and_Glebe_Point_NSW.JPG/500px-Bicentennial_Park_and_Glebe_Point_NSW.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-rushcutters-bay': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/AUS_Sydney%2C_Woollahra%2C_Rushcutters_Bay_Park_003.jpg/500px-AUS_Sydney%2C_Woollahra%2C_Rushcutters_Bay_Park_003.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-marks-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Mark%27s_Park%2C_Tamarama%2C_during_Sculptures_by_the_Sea_2011_-_panoramio.jpg/500px-Mark%27s_Park%2C_Tamarama%2C_during_Sculptures_by_the_Sea_2011_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-camperdown-memorial': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/%281%29Camperdown_Memorial_Rest_Park.jpg/500px-%281%29Camperdown_Memorial_Rest_Park.jpg',
  'syd-callan-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Broughton_Hall%2C_Callan_Park%2C_in_2020_-_side_view.jpg/500px-Broughton_Hall%2C_Callan_Park%2C_in_2020_-_side_view.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-st-leonards-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/St_Leonards_Park.jpg/500px-St_Leonards_Park.jpg',
  'syd-st-ives-dog-ring': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/DFEC_St_Ives_Showground.jpg/500px-DFEC_St_Ives_Showground.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-manly-lagoon': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/2007-08-04_Manly%2C_New_South_Wales_b_%28cropped%29.jpg/500px-2007-08-04_Manly%2C_New_South_Wales_b_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'syd-morrison-bay': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Settlers_Park_-_panoramio.jpg/500px-Settlers_Park_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-parramatta-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/River_Foreshore_Reserve%2C_Parramatta_03.jpg/500px-River_Foreshore_Reserve%2C_Parramatta_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-dan-mahoney': 'https://atparramatta.com/sites/discoverparra/files/styles/global_image_style/public/2021-07/Dan%20Mahoney%20Reserve_0.jpg?itok=LzBqGPAz',
  'syd-crestwood-hills': 'https://hillsdistrictmums.com.au/wp-content/uploads/2018/06/Crestwood-Reserve-Learn-to-Ride-1200.jpg',
  'syd-bungarribee': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/WesternSydneyParklands.jpg/500px-WesternSydneyParklands.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-bicentennial-olympic': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Lake_Belvedere%2C_Bicentennial_Park_in_Sydney_Olympic_Park.jpg/500px-Lake_Belvedere%2C_Bicentennial_Park_in_Sydney_Olympic_Park.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-steel-park-cooks': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/2023-04-16_Steel_Park%2C_Marrickville.jpg/500px-2023-04-16_Steel_Park%2C_Marrickville.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-carss-bush-park': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/CarssparkC4.jpg/500px-CarssparkC4.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-helena-st-kirrawee': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/2015-07-25_Joseph_Banks_Native_Plants_Reserve%2C_Kareela%2C_NSW.jpg/500px-2015-07-25_Joseph_Banks_Native_Plants_Reserve%2C_Kareela%2C_NSW.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-shale-hills': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Western_Sydney_parklands_21.jpg/500px-Western_Sydney_parklands_21.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'syd-jamison-penrith': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Aus_nsw_nepean_river_dsc05078.jpg/500px-Aus_nsw_nepean_river_dsc05078.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'syd-milton-macarthur': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Australian_Botanic_Garden_Mount_Annan.jpg/500px-Australian_Botanic_Garden_Mount_Annan.jpg',
  'syd-barangaroo-headland': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Barangaroo_Reserve_pano.jpg/500px-Barangaroo_Reserve_pano.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-west-bund': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/Xuhui_Riverside_Shanghai.jpg/500px-Xuhui_Riverside_Shanghai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-expo-doggo': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Moon_Bridge_in_Shanghai_Expo_Culture_Park_20251129.jpg/500px-Moon_Bridge_in_Shanghai_Expo_Culture_Park_20251129.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-century-pet': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Century_Park_002.JPG/500px-Century_Park_002.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-heping-dog': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Heping_Gongyuan.JPG/500px-Heping_Gongyuan.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-gate-m': 'https://oss.gooood.cn/uploads/2025/07/000-GATE-M-West-Bund-Dream-Center-by-MVRDV-psi-472x303.jpg',
  'sh-pengpu': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Jing%27an_Sculpture_Park%2C_Shanghai%2C_China_%28December_2015%29_-_09.JPG/500px-Jing%27an_Sculpture_Park%2C_Shanghai%2C_China_%28December_2015%29_-_09.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-dahuangcun': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Baoshan%2C_Shanghai%2C_China_-_panoramio_%286%29.jpg/500px-Baoshan%2C_Shanghai%2C_China_-_panoramio_%286%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-yanbei': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/%E5%85%B1%E9%9D%92%E6%A3%AE%E6%9E%97%E5%85%AC%E5%9B%AD%EF%BC%8CGongqing_Forest_Park_-_panoramio.jpg/500px-%E5%85%B1%E9%9D%92%E6%A3%AE%E6%9E%97%E5%85%AC%E5%9B%AD%EF%BC%8CGongqing_Forest_Park_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-langxiang': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/2016_Shanghai_Cherry_Blossom_Festival_in_Gucun_Park.JPG/500px-2016_Shanghai_Cherry_Blossom_Festival_in_Gucun_Park.JPG',
  'sh-lets-dog': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/%E4%B8%8A%E6%B5%B7%E5%A5%87%E8%BF%B9%E8%8A%B1%E5%9B%AD_15-09-2018.jpg/500px-%E4%B8%8A%E6%B5%B7%E5%A5%87%E8%BF%B9%E8%8A%B1%E5%9B%AD_15-09-2018.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-suhewan': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/%E4%B8%8A%E6%B5%B7%E8%8B%8F%E6%B2%B3%E6%B9%BE%E4%B8%87%E8%B1%A1%E5%A4%A9%E5%9C%B0.png/500px-%E4%B8%8A%E6%B5%B7%E8%8B%8F%E6%B2%B3%E6%B9%BE%E4%B8%87%E8%B1%A1%E5%A4%A9%E5%9C%B0.png?utm_source=zh.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'sh-sleepless': 'https://ja.storage.shmedia.tech/9207b941f6b14f779d27c320a8685182.jpg',
  'sh-dongjiaojing': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/%E4%B8%9C%E8%8C%AD%E6%B3%BE%E5%85%AC%E5%9B%AD.jpg/500px-%E4%B8%9C%E8%8C%AD%E6%B3%BE%E5%85%AC%E5%9B%AD.jpg?utm_source=zh.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'sh-zhonghuan': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Daninglingshigongyuan.jpg/500px-Daninglingshigongyuan.jpg?utm_source=zh.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'sh-nanyuan': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/%E5%8D%97%E5%9C%92.webp/500px-%E5%8D%97%E5%9C%92.webp?utm_source=zh.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'sh-daji': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Fuxing_Park%2C_Shanghai.JPG/500px-Fuxing_Park%2C_Shanghai.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-jingmi': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Huaihai_Park%2C_Shanghai.jpg/500px-Huaihai_Park%2C_Shanghai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-runway-park': 'https://www.sasaki.com/wp-content/uploads/2019/11/26399_01U_N256_large-1000x643.jpg',
  'sh-haisu': 'https://oss.gooood.cn/uploads/2024/12/041-cpark-haisu-by-gensler-%E6%8B%B7%E8%B4%9D-472x303.jpg',
  'sh-gubei': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/201706_Buildings_in_Gubei.jpg/500px-201706_Buildings_in_Gubei.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  'sh-kunshan': 'https://www.shhk.gov.cn/shhk-web/epointtemp/editor/uploadfile/20181107093217370.jpg',
  'sh-hunan-loop': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Wukang_Road_near_Huaihai_Road%2C_Shanghai.jpg/500px-Wukang_Road_near_Huaihai_Road%2C_Shanghai.jpg?utm_source=zh.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'sh-banma-suhe': 'https://imgpai.thepaper.cn/newpai/image/1790131373648_3je2r3_1790148048582.JPG?x-oss-process=image/resize,w_1024',
  'sh-century-outer': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Century_Park_Shanghai%2C_fishing.jpg/500px-Century_Park_Shanghai%2C_fishing.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
  'sh-minhang-river': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/%E6%98%86%E9%98%B3%E6%B9%96%2C%E4%B8%8A%E6%B5%B7%E9%97%B5%E8%A1%8C_Minhang%2CShanghai_-_panoramio.jpg/500px-%E6%98%86%E9%98%B3%E6%B9%96%2C%E4%B8%8A%E6%B5%B7%E9%97%B5%E8%A1%8C_Minhang%2CShanghai_-_panoramio.jpg',
  'sh-xinjiangwan': 'https://q0.itc.cn/q_70/images03/20251126/7a748b301ffc4f79a78ed2d5607b06e2.jpeg',
  'sh-panlong': 'https://www.sasaki.com/wp-content/uploads/2020/09/8-Panlong-Historic-Core-1000x548.jpg',
  'sh-fish-art': 'https://www.fengxian.gov.cn/col55/20231026/55515/76ca7787785f417896fc1eedbe5bfab4.png',
};

const ALLOWED_REMOTE_HOSTS: ReadonlySet<string> = new Set([
  'upload.wikimedia.org',
  'thumb.wikimedia.org',
  'www.findadogpark.com.au',
  'theyappack.com.au',
  'www.travelnuity.com',
  'img.meatinapark.com.au',
  'www.sasaki.com',
  'www.shhk.gov.cn',
  'www.melbourneplaygrounds.com.au',
  'hillsdistrictmums.com.au',
  'oss.gooood.cn',
  'imgpai.thepaper.cn',
  'q0.itc.cn',
  'atparramatta.com',
  'www.fengxian.gov.cn',
  'ja.storage.shmedia.tech',
]);

/**
 * Validates that a park thumbnail URI is either a clean first-party `park-thumbs/<id>.jpg`
 * asset path or an allow-listed `https://` image URL (preventing `javascript:`, `http:`, or traversal).
 */
export function isSafeParkPhotoUrl(rawUrl?: string | null): rawUrl is string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return false;
  }
  const trimmed = rawUrl.trim();
  if (/^(?:\.?\/)?park-thumbs\/[a-z0-9-]+\.jpg$/.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    return ALLOWED_REMOTE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Resolves the optimal thumbnail URI for a park or dog beach:
 * - On Web: serves static first-party `park-thumbs/<id>.jpg` (`240x240` verified JPEG) with zero CORS/rate-limit issues.
 * - On Native or live OSM outer-suburb parks: uses validated `https://` photo URL when available.
 */
export function resolveParkPhotoUri(
  spotId?: string | null,
  explicitPhotoUrl?: string | null
): string | null {
  if (spotId && SAFE_CURATED_ID_RE.test(spotId) && CURATED_PARK_PHOTO_IDS.has(spotId)) {
    if (Platform.OS === 'web') {
      return `./park-thumbs/${spotId}.jpg`;
    }
    const remote = REMOTE_HTTPS_PARK_PHOTOS[spotId];
    if (remote && isSafeParkPhotoUrl(remote)) {
      return remote;
    }
  }
  if (isSafeParkPhotoUrl(explicitPhotoUrl)) {
    return explicitPhotoUrl.trim();
  }
  return null;
}

/**
 * Resolves a React Native `<Image source={...} />` prop for a park or dog beach:
 * - On iOS & Android Native: uses the offline bundled `assets/park-thumbs/<id>.jpg` asset (`require(...)`)
 *   first so all 90 curated Melbourne, Sydney, and Shanghai parks load instantaneously offline.
 * - On Web or live outer-suburb OSM parks: uses the validated `/park-thumbs/<id>.jpg` or `https://` URI.
 */
export function resolveParkPhotoSource(
  spotId?: string | null,
  explicitPhotoUrl?: string | null
): ImageSourcePropType | null {
  if (
    Platform.OS !== 'web' &&
    spotId &&
    SAFE_CURATED_ID_RE.test(spotId) &&
    NATIVE_PARK_PHOTO_ASSETS[spotId]
  ) {
    return NATIVE_PARK_PHOTO_ASSETS[spotId];
  }
  const uri = resolveParkPhotoUri(spotId, explicitPhotoUrl);
  return uri ? { uri } : null;
}
