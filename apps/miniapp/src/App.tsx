import React, { useEffect, useState, useMemo } from "react";
import styles from "./App.module.css";
import { useTelegram } from "./TelegramContext";
import {
  ApiService,
  ApiBarber,
  AvailabilityResponse,
  BookingResponse,
  getServices,
  getBarbers,
  getAvailability,
  createBooking,
  getMyBookings,
  cancelBooking,
  formatPriceUZS,
  formatDurationMin,
} from "./api";

type Tab = "book" | "my-bookings";
type Step = "service" | "barber" | "date" | "time" | "contact" | "success";

export default function App() {
  const { tg, user, initData } = useTelegram();
  const hapticFeedback = tg?.HapticFeedback;
  const [tab, setTab] = useState<Tab>("book");

  // Flow State
  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<ApiService[]>([]);
  const [barbers, setBarbers] = useState<ApiBarber[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("any");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [clientName, setClientName] = useState<string>(user ? `${user.first_name} ${user.last_name || ""}`.trim() : "");
  const [clientPhone, setClientPhone] = useState<string>("");

  // History & Loading state
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<BookingResponse | null>(null);

  // Initial load
  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        const [servicesData, barbersData] = await Promise.all([getServices(), getBarbers()]);
        setServices(servicesData);
        setBarbers(barbersData);
      } catch (err: unknown) {
        setError("Не удалось загрузить данные. Проверьте интернет соединение.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadInitialData();
  }, []);

  // Load user bookings
  useEffect(() => {
    if (tab === "my-bookings" && initData) {
      void fetchBookings();
    }
  }, [tab, initData]);

  async function fetchBookings() {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getMyBookings(initData);
      setBookings(res.bookings || []);
    } catch {
      // Mock / fallback if no token or offline
    } finally {
      setIsLoading(false);
    }
  }

  // Load availability when date & barber & services are selected
  useEffect(() => {
    if (selectedDate && selectedServiceIds.length > 0) {
      async function fetchSlots() {
        try {
          setIsLoading(true);
          const res = await getAvailability({
            serviceIds: selectedServiceIds,
            barberId: selectedBarberId,
            date: selectedDate,
          });
          setAvailability(res);
        } catch {
          setError("Не удалось получить свободные слоты.");
        } finally {
          setIsLoading(false);
        }
      }
      void fetchSlots();
    }
  }, [selectedDate, selectedBarberId, selectedServiceIds]);

  // Selected services info
  const selectedServices = useMemo(() => {
    return services.filter((s) => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices]);

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  }, [selectedServices]);

  // Next 14 days generator
  const dates = useMemo(() => {
    const list: { date: string; day: string; weekday: string; month: string }[] = [];
    const today = new Date();
    const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      list.push({
        date: dateStr,
        day: String(d.getDate()),
        weekday: weekdays[d.getDay()],
        month: months[d.getMonth()],
      });
    }
    return list;
  }, []);

  // Handle service toggle
  const toggleService = (id: string) => {
    hapticFeedback?.impactOccurred("light");
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Submit booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !clientName || !clientPhone) return;

    try {
      setIsLoading(true);
      setError(null);
      const res = await createBooking({
        serviceIds: selectedServiceIds,
        barberId: selectedBarberId,
        startsAt: selectedSlot,
        client: { name: clientName, phone: clientPhone },
        initData,
      });
      hapticFeedback?.notificationOccurred("success");
      setCreatedBooking(res);
      setStep("success");
    } catch (err: unknown) {
      hapticFeedback?.notificationOccurred("error");
      setError((err as Error).message || "Ошибка при создании записи.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (token: string) => {
    if (!confirm("Вы уверены, что хотите отменить запись?")) return;
    try {
      setIsLoading(true);
      await cancelBooking(token);
      hapticFeedback?.notificationOccurred("warning");
      await fetchBookings();
    } catch {
      alert("Не удалось отменить запись.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.app}>
      {/* Top Header */}
      <header className={styles.topBar}>
        <div className={styles.brand}>BARBER SHOP</div>
        <div className={styles.userBadge}>
          {user ? `👤 ${user.first_name}` : "Ташкент, Шота Руставели 18"}
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.content}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        {tab === "book" && (
          <div>
            {/* Step 1: Select Services */}
            {step === "service" && (
              <div>
                <div className={styles.sectionHead}>
                  <span className={styles.stepNum}>Шаг 1 из 5</span>
                  <h2 className={styles.sectionTitle}>Выберите услуги</h2>
                  <p className={styles.sectionSub}>Можно выбрать одну или несколько процедур</p>
                </div>

                <div className={styles.cardList}>
                  {services.map((svc) => {
                    const isSelected = selectedServiceIds.includes(svc.id);
                    return (
                      <div
                        key={svc.id}
                        className={`${styles.serviceCard} ${isSelected ? styles.serviceCardActive : ""}`}
                        onClick={() => toggleService(svc.id)}
                      >
                        <div className={styles.serviceHeader}>
                          <span className={styles.serviceName}>{svc.name}</span>
                          <span className={styles.servicePrice}>{formatPriceUZS(svc.price)}</span>
                        </div>
                        <div className={styles.serviceMeta}>
                          <span>⏱ {formatDurationMin(svc.durationMin)}</span>
                        </div>
                        <p className={styles.serviceDesc}>{svc.description}</p>
                      </div>
                    );
                  })}
                </div>

                <button
                  className={styles.btnPrimary}
                  disabled={selectedServiceIds.length === 0}
                  onClick={() => {
                    hapticFeedback?.impactOccurred("medium");
                    setStep("barber");
                  }}
                >
                  Далее ({formatPriceUZS(totalPrice)})
                </button>
              </div>
            )}

            {/* Step 2: Select Barber */}
            {step === "barber" && (
              <div>
                <div className={styles.sectionHead}>
                  <span className={styles.stepNum}>Шаг 2 из 5</span>
                  <h2 className={styles.sectionTitle}>Выберите мастера</h2>
                  <p className={styles.sectionSub}>Любой свободный мастер или конкретный специалист</p>
                </div>

                <div className={styles.barberGrid}>
                  <div
                    className={`${styles.barberCard} ${selectedBarberId === "any" ? styles.barberCardActive : ""}`}
                    onClick={() => {
                      hapticFeedback?.impactOccurred("light");
                      setSelectedBarberId("any");
                    }}
                  >
                    <div className={styles.barberAvatarAny}>★</div>
                    <div className={styles.barberName}>Любой мастер</div>
                    <div className={styles.barberBio}>Ближайшее доступное время</div>
                  </div>

                  {barbers.map((b) => (
                    <div
                      key={b.id}
                      className={`${styles.barberCard} ${selectedBarberId === b.id ? styles.barberCardActive : ""}`}
                      onClick={() => {
                        hapticFeedback?.impactOccurred("light");
                        setSelectedBarberId(b.id);
                      }}
                    >
                      <img src={b.photoUrl || "/images/barber-1.jpg"} alt={b.name} className={styles.barberPhoto} />
                      <div className={styles.barberName}>{b.name}</div>
                      <div className={styles.barberBio}>{b.experienceYears} лет опыта</div>
                    </div>
                  ))}
                </div>

                <button
                  className={styles.btnPrimary}
                  onClick={() => {
                    hapticFeedback?.impactOccurred("medium");
                    setStep("date");
                  }}
                >
                  Далее к дате
                </button>
                <button className={styles.btnOutline} onClick={() => setStep("service")}>
                  Назад к услугам
                </button>
              </div>
            )}

            {/* Step 3: Select Date */}
            {step === "date" && (
              <div>
                <div className={styles.sectionHead}>
                  <span className={styles.stepNum}>Шаг 3 из 5</span>
                  <h2 className={styles.sectionTitle}>Выберите дату</h2>
                  <p className={styles.sectionSub}>Доступные дни на ближайшие 2 недели</p>
                </div>

                <div className={styles.dateGrid}>
                  {dates.map((d) => (
                    <button
                      key={d.date}
                      className={`${styles.dateButton} ${selectedDate === d.date ? styles.dateButtonActive : ""}`}
                      onClick={() => {
                        hapticFeedback?.impactOccurred("light");
                        setSelectedDate(d.date);
                      }}
                    >
                      <span className={styles.dateWeekday}>{d.weekday}</span>
                      <span className={styles.dateDay}>{d.day}</span>
                      <span className={styles.dateMonth}>{d.month}</span>
                    </button>
                  ))}
                </div>

                <button
                  className={styles.btnPrimary}
                  disabled={!selectedDate}
                  onClick={() => {
                    hapticFeedback?.impactOccurred("medium");
                    setStep("time");
                  }}
                >
                  Далее к времени
                </button>
                <button className={styles.btnOutline} onClick={() => setStep("barber")}>
                  Назад
                </button>
              </div>
            )}

            {/* Step 4: Select Time Slot */}
            {step === "time" && (
              <div>
                <div className={styles.sectionHead}>
                  <span className={styles.stepNum}>Шаг 4 из 5</span>
                  <h2 className={styles.sectionTitle}>Выберите время</h2>
                  <p className={styles.sectionSub}>Свободные окна на {selectedDate}</p>
                </div>

                {isLoading && (
                  <div className={styles.emptyBox}>
                    <div className={styles.spinner} />
                    <p>Ищем свободные слоты...</p>
                  </div>
                )}

                {!isLoading && availability && availability.slots.length === 0 && (
                  <div className={styles.emptyBox}>
                    <p>К сожалению, на эту дату нет свободных слотов.</p>
                    <button className={styles.btnOutline} onClick={() => setStep("date")}>
                      Выбрать другую дату
                    </button>
                  </div>
                )}

                {!isLoading && availability && availability.slots.length > 0 && (
                  <div className={styles.timeGrid}>
                    {availability.slots.map((s) => (
                      <button
                        key={s.startsAt}
                        className={`${styles.timeSlot} ${selectedSlot === s.startsAt ? styles.timeSlotActive : ""}`}
                        onClick={() => {
                          hapticFeedback?.impactOccurred("light");
                          setSelectedSlot(s.startsAt);
                        }}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  className={styles.btnPrimary}
                  disabled={!selectedSlot}
                  onClick={() => {
                    hapticFeedback?.impactOccurred("medium");
                    setStep("contact");
                  }}
                >
                  Далее к подтверждению
                </button>
                <button className={styles.btnOutline} onClick={() => setStep("date")}>
                  Назад к дате
                </button>
              </div>
            )}

            {/* Step 5: Contact & Confirmation */}
            {step === "contact" && (
              <form onSubmit={handleBookingSubmit}>
                <div className={styles.sectionHead}>
                  <span className={styles.stepNum}>Шаг 5 из 5</span>
                  <h2 className={styles.sectionTitle}>Подтверждение</h2>
                  <p className={styles.sectionSub}>Проверьте данные и укажите ваш телефон</p>
                </div>

                <div className={styles.summaryBox}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Услуги</span>
                    <span className={styles.summaryVal}>
                      {selectedServices.map((s) => s.name).join(", ")}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Длительность</span>
                    <span className={styles.summaryVal}>{formatDurationMin(totalDuration)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Стоимость</span>
                    <span className={styles.summaryVal}>{formatPriceUZS(totalPrice)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Дата и время</span>
                    <span className={styles.summaryVal}>
                      {selectedDate} в {selectedSlot ? new Date(selectedSlot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Ваше имя</label>
                  <input
                    className={styles.input}
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Алишер"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Телефон</label>
                  <input
                    className={styles.input}
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                  />
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
                  {isLoading ? "Оформляем..." : "Подтвердить запись"}
                </button>
                <button type="button" className={styles.btnOutline} onClick={() => setStep("time")}>
                  Назад ко времени
                </button>
              </form>
            )}

            {/* Step 6: Success */}
            {step === "success" && createdBooking && (
              <div className={styles.emptyBox}>
                <h2 className={styles.sectionTitle}>Вы успешно записаны!</h2>
                <p className={styles.sectionSub}>
                  Мы ждем вас {new Date(createdBooking.startsAt).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}
                </p>
                <div className={styles.summaryBox} style={{ width: "100%", marginTop: "1rem" }}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Мастер</span>
                    <span className={styles.summaryVal}>{createdBooking.barber.name}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Сумма</span>
                    <span className={styles.summaryVal}>{formatPriceUZS(createdBooking.totalPrice)}</span>
                  </div>
                </div>
                <button
                  className={styles.btnPrimary}
                  onClick={() => {
                    setStep("service");
                    setSelectedServiceIds([]);
                    setSelectedSlot("");
                    setCreatedBooking(null);
                  }}
                >
                  Записаться снова
                </button>
              </div>
            )}
          </div>
        )}

        {/* My Bookings Tab */}
        {tab === "my-bookings" && (
          <div>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Мои записи</h2>
              <p className={styles.sectionSub}>История и предстоящие визиты</p>
            </div>

            {isLoading && (
              <div className={styles.emptyBox}>
                <div className={styles.spinner} />
                <p>Загрузка записей...</p>
              </div>
            )}

            {!isLoading && bookings.length === 0 && (
              <div className={styles.emptyBox}>
                <p>У вас пока нет активных записей.</p>
                <button className={styles.btnPrimary} onClick={() => setTab("book")}>
                  Записаться
                </button>
              </div>
            )}

            {!isLoading && bookings.length > 0 && (
              <div className={styles.cardList}>
                {bookings.map((b) => (
                  <div key={b.id} className={styles.serviceCard}>
                    <div className={styles.serviceHeader}>
                      <span className={styles.serviceName}>{b.barber.name}</span>
                      <span
                        className={`${styles.statusBadge} ${
                          b.status === "confirmed" ? styles.statusConfirmed : styles.statusCancelled
                        }`}
                      >
                        {b.status === "confirmed" ? "Подтверждено" : b.status}
                      </span>
                    </div>
                    <div className={styles.serviceMeta}>
                      <span>
                        📅 {new Date(b.startsAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      <span>💰 {formatPriceUZS(b.totalPrice)}</span>
                    </div>
                    {b.status === "confirmed" && (
                      <button
                        className={`${styles.btnOutline} ${styles.btnDanger}`}
                        onClick={() => handleCancelBooking(b.manageToken)}
                      >
                        Отменить запись
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className={styles.bottomNav}>
        <button
          className={`${styles.navItem} ${tab === "book" ? styles.navItemActive : ""}`}
          onClick={() => {
            hapticFeedback?.impactOccurred("light");
            setTab("book");
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>✂️</span>
          <span>Запись</span>
        </button>
        <button
          className={`${styles.navItem} ${tab === "my-bookings" ? styles.navItemActive : ""}`}
          onClick={() => {
            hapticFeedback?.impactOccurred("light");
            setTab("my-bookings");
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>📋</span>
          <span>Мои записи</span>
        </button>
      </nav>
    </div>
  );
}
