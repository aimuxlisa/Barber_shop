# Контекст для продолжения

Этап 1 закрыт. Этап 2 не начат.

Читать вместе с `tasks-final.md`, `prd-final.md`, `spec-final.md`. Если лендинг и учебный план расходятся, для уже сделанной главной страницы приоритет у этого файла.

## Статус

Сделан только публичный лендинг в `apps/web`. Backend, база, `/book`, Mini App и админка не существуют.

Запуск из корня репозитория:

```bash
npm run dev
npm run lint
npm run build
```

`npm run dev` поднимает `@barbershop/web`. Если порт 3000 занят, Next берёт следующий свободный.

## Что уже есть

Монорепозиторий npm workspaces: корневой `package.json`, пакет `@barbershop/web` в `apps/web`.

Стек лендинга:

- Next.js 16.3.8, App Router, React 19, TypeScript, ESLint
- без Tailwind
- GSAP 3.15, `@gsap/react`, Lenis 1.3
- плагины GSAP регистрируются только в `apps/web/src/lib/gsap.ts` и только из клиентских компонентов

Бренд лендинга: **Orda**, мужской груминг в Ташкенте. Язык страницы — английский. Тема одна, тёмная. Переключателя светлой темы нет.

Палитра:

- фон `#0B0B0A`, второй слой `#151513`
- тёплый светлый `#E8E1D5`
- текст `#F3F0EA`, вторичный `#96928A`
- акцент `#B58A5A`

Шрифты: Bodoni Moda для заголовков, Host Grotesk для интерфейса. Подключены через `next/font` в `layout.tsx`.

Данные-моки: `apps/web/src/data/content.ts`. Фото: `apps/web/public/images/`. Это сгенерированные кадры под палитру, не сток и не иконки.

## Состав главной

Порядок секций в `apps/web/src/app/page.tsx`:

1. `Nav` — прозрачная шапка поверх hero. Ссылки: Services, Barbers, Space, Contact. При скролле фон становится тёмным. На узком экране полноэкранное меню, не карточка.
2. `Hero` — фото на весь первый экран. Текст: Tashkent · Men's grooming, Your style. / Your standard., Book a visit, Explore the space.
3. `Statement` — «Not just a haircut. A ritual.» Слова светлеют при скролле.
4. `Services` — вертикальный список 01–05, не сетка карточек. На desktop справа меняется большое фото. На mobile строка раскрывается.
5. `Barbers` — «The hands behind the craft», 4 портрета. На desktop секция закреплена и едет вбок. На телефоне обычный горизонтальный свайп.
6. `Tashkent` — «Built in Tashkent. Made for men who move.»
7. `Space` — асимметричные фото интерьера, лёгкий параллакс у одного кадра.
8. `Signature` — единственный главный scroll-момент: фото раскрывается на весь экран, по очереди появляются Precision, Craft, Character.
9. `Proof` — один отзыв Тимура Рахимова и два кадра.
10. `Booking` — «Your next signature look starts here.»
11. `SiteFooter` — адрес, часы, Instagram, Telegram, телефон, Book a visit. `id="contact"`.

Контакты салона:

- 18 Shota Rustaveli Street, Tashkent, Uzbekistan
- Tuesday–Sunday, 11:00–21:00
- +998 71 255 18 00

Кнопки записи ведут на телефон `tel:+998712551800`, кроме «Book a visit» и «Book now» в шапке и hero: они скроллят к `#book`. Страницы `/book` нет.

Встроенной карты нет. Пункт «контакты и карта» в этапе 1 закрыт футером и городскими кадрами. Карту-iframe не возвращать: это ломает текущую композицию.

## Движение

`SmoothScroll` крутит Lenis от `gsap.ticker`. `autoRaf: false`, `lerp: 0.08`, `syncTouch: false`, `scrub: true`. Пины с `pinType: "transform"`, чтобы не было скачка вёрстки.

`prefers-reduced-motion` отключает пины, параллакс и intro. Lenis сам переходит на обычный скролл.

Не добавлять второй такой же pin, WebGL, barber pole, ножницы как графику, чёрно-красную палитру, glassmorphism и одинаковый fade-up на все блоки.

Якоря — обычные `<a href="#...">`, не `next/link`. Иначе Lenis и Next спорят за скролл.

## Проверено

Линтер и `npm run build` проходят. Проверка движения на 1440 и 390, включая reduced motion: горизонтального вылезания нет, CLS 0, скрытого текста нет.

## Что не делать вслепую

`prd-final.md` описывает MVP на русском и две темы. Для лендинга это уже заменено брифом Orda: английский и только тёмная тема. Этап 2 в `tasks-final.md` по-прежнему на русском: услуга, барбер, дата, время, контакты, подтверждение. Перед `/book` нужно явно решить, на каком языке форма. Сам этап 2 не начат.

`packages/ui`, `packages/shared`, `apps/api`, `apps/miniapp` и `supabase/` из спецификации ещё не созданы. Их очередь — этапы 3 и дальше.
