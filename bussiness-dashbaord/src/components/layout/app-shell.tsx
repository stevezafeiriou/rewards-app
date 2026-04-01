import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
	HiOutlineArrowLeftOnRectangle,
	HiOutlineBars3,
	HiOutlineBell,
	HiOutlineBriefcase,
	HiOutlineCog6Tooth,
	HiOutlineCreditCard,
	HiOutlineHome,
	HiOutlineLifebuoy,
	HiOutlineMagnifyingGlass,
	HiOutlineMoon,
	HiOutlineSun,
	HiOutlineTag,
	HiOutlineUserCircle,
	HiOutlineUsers,
	HiOutlineXMark,
} from "react-icons/hi2";
import fallingImage from "@/assets/falling.jpg";
import { AppFooter } from "@/components/layout/app-footer";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/ui/lazy-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import {
	useBusiness,
	useGlobalSearch,
	useMarkNotificationsRead,
	useNotifications,
} from "@/features/business/hooks";
import { useTheme } from "@/features/theme/theme-provider";
import { useAppTranslation } from "@/i18n/use-app-translation";
import { FadeIn } from "@/components/ui/motion";
import { queryKeys } from "@/lib/query-keys";
import { formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export function AppShell() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const { signOut, user } = useAuth();
	const business = useBusiness();
	const notifications = useNotifications(user?.id, 5);
	const deferredSearch = useDeferredValue(debouncedSearch);
	const globalSearch = useGlobalSearch(deferredSearch, business.data?.id, user?.id);
	const markNotificationsRead = useMarkNotificationsRead();
	const { theme, toggleTheme } = useTheme();
	const { t } = useAppTranslation(["navigation", "common"]);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const ThemeIcon = theme === "dark" ? HiOutlineSun : HiOutlineMoon;
	const unreadNotifications =
		notifications.data?.filter((notification) => !notification.is_read) ?? [];
	const normalizedSearch = searchValue.trim();
	const normalizedMemberIdentifier = normalizedSearch.replace(/\D/g, "");
	const isExactMemberIdentifier = /^\d{9}$/.test(normalizedMemberIdentifier);
	const hasSearchQuery = normalizedSearch.length >= 2;
	const hasSearchResults = !!(
		globalSearch.data?.member ||
		globalSearch.data?.offers.length ||
		globalSearch.data?.tickets.length
	);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedSearch(searchValue.trim());
		}, 220);

		return () => window.clearTimeout(timeout);
	}, [searchValue]);

	useEffect(() => {
		function handleGlobalShortcut(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const tagName = target?.tagName?.toLowerCase();
			const isTypingContext =
				target?.isContentEditable ||
				tagName === "input" ||
				tagName === "textarea" ||
				tagName === "select";

			if (isTypingContext) return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;

			const key = event.key.toLowerCase();

			if (key === "n") {
				event.preventDefault();
				navigate("/offers/create");
				return;
			}

			if (key === "o") {
				event.preventDefault();
				navigate("/customers/identify");
			}
		}

		window.addEventListener("keydown", handleGlobalShortcut);
		return () => window.removeEventListener("keydown", handleGlobalShortcut);
	}, [navigate]);

	const primarySearchTarget = useMemo(() => {
		if (globalSearch.data?.member) {
			return `/customers/identify/${globalSearch.data.member.public_user_id}`;
		}

		if (isExactMemberIdentifier) {
			return `/customers/identify/${normalizedMemberIdentifier}`;
		}

		if (globalSearch.data?.offers[0]) {
			return `/offers/${globalSearch.data.offers[0].id}`;
		}

		if (globalSearch.data?.tickets[0]) {
			return `/support/tickets/${globalSearch.data.tickets[0].id}`;
		}

		return null;
	}, [globalSearch.data, isExactMemberIdentifier, normalizedMemberIdentifier]);

	async function handleMarkAllNotificationsRead() {
		if (unreadNotifications.length === 0) return;
		await markNotificationsRead.mutateAsync(
			unreadNotifications.map((notification) => notification.id),
		);
		await queryClient.invalidateQueries({
			queryKey: queryKeys.notifications(user?.id, 5),
		});
	}

	const navItems = [
		{ to: "/dashboard", label: t("sidebar.overview"), icon: HiOutlineHome },
		{ to: "/offers", label: t("sidebar.offers"), icon: HiOutlineTag },
		{ to: "/customers", label: t("sidebar.customers"), icon: HiOutlineUsers },
		{ to: "/profile", label: t("sidebar.profile"), icon: HiOutlineBriefcase },
		{ to: "/settings", label: t("sidebar.settings"), icon: HiOutlineCog6Tooth },
		{
			to: "/settings/subscription",
			label: t("sidebar.subscription"),
			icon: HiOutlineCreditCard,
		},
		{ to: "/support", label: t("sidebar.support"), icon: HiOutlineLifebuoy },
	];

	async function handleSignOut() {
		await signOut();
		navigate("/auth/login");
	}

	const sidebar = (
		<div className="flex h-full flex-col justify-between gap-4 rounded-[1.8rem] bg-sidebar p-4 text-nav-text shadow-[0_18px_52px_rgba(2,6,23,0.32)]">
			<div className="flex min-h-0 flex-1 flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
							{t("sidebar.eyebrow")}
						</p>
						<p className="mt-1 text-lg font-extrabold text-white">
							{t("common.appName")}
						</p>
					</div>
					<button
						className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sidebar-border text-white/60 lg:hidden"
						aria-label={t("common.buttons.cancel")}
						onClick={() => setMobileOpen(false)}
					>
						<HiOutlineXMark aria-hidden="true" className="h-5 w-5" />
					</button>
				</div>

				<nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
					{navItems.map((item) => {
						const Icon = item.icon;
						return (
							<NavLink
								key={item.to}
								to={item.to}
								end={item.to !== '/offers' && item.to !== '/customers' && item.to !== '/support'}
								className={({ isActive }) =>
									`app-nav-item flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold ${
										isActive ? "app-nav-item-active" : ""
									}`
								}
								onClick={() => setMobileOpen(false)}
							>
								<Icon className="h-5 w-5" />
								<span>{item.label}</span>
							</NavLink>
						);
					})}
				</nav>
			</div>

			<div className="shrink-0 overflow-hidden rounded-[1.65rem] border border-white/8 bg-white/5 shadow-[0_20px_42px_rgba(6,10,20,0.28)]">
				<LazyImage
					src={fallingImage}
					alt="emsek.gr"
					className="h-28 w-full object-cover"
					wrapperClassName="h-28 w-full"
				/>
				<div className="border-t border-white/8 bg-white/4 p-3.5">
					<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/52">
						Powered by
					</p>
					<p className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-white">
						emsek.gr
					</p>
				</div>
			</div>

			<div className="space-y-2.5 border-t border-sidebar-border pt-3.5">
				<button
					className="app-nav-item flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-semibold"
					onClick={toggleTheme}
				>
					<ThemeIcon className="h-5 w-5" />
					<span>
						{theme === "dark"
							? t("common.theme.dark")
							: t("common.theme.light")}
					</span>
				</button>
				<a
					className="app-nav-item flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold"
					href="https://app.domain.com"
					target="_blank"
					rel="noreferrer"
				>
					<HiOutlineUserCircle className="h-5 w-5" />
					<span>{t("common.labels.memberApp")}</span>
				</a>
			</div>
		</div>
	);

	return (
		<div className="app-shell grid min-h-screen w-full grid-cols-1 gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-5 xl:px-8">
			<aside className="app-shell-sidebar hidden lg:block">{sidebar}</aside>

			<AnimatePresence>
				{mobileOpen ? (
					<motion.div
						className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<motion.div
							className="h-full w-[88vw] max-w-[320px] p-4"
							initial={{ x: -28, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: -28, opacity: 0 }}
							transition={{ duration: 0.22, ease: "easeOut" }}
						>
							{sidebar}
						</motion.div>
					</motion.div>
				) : null}
			</AnimatePresence>

			<main className="flex min-w-0 flex-1 flex-col gap-6 pb-6">
				<FadeIn className="app-topbar flex items-center gap-3 px-0 py-1">
					<button
						className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-elevated shadow-soft lg:hidden"
						aria-label={t("sidebar.eyebrow")}
						onClick={() => setMobileOpen(true)}
					>
						<HiOutlineBars3
							aria-hidden="true"
							className="h-6 w-6 text-foreground"
						/>
					</button>
					<div className="group relative min-w-0 flex-1">
						<div className="app-search-pill flex h-12 min-w-0 items-center gap-3 px-4">
						<HiOutlineMagnifyingGlass className="h-5 w-5 shrink-0 text-muted-foreground" />
						<input
							aria-label={t("topbar.searchPlaceholder")}
							className="w-full border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
							placeholder={t("topbar.searchPlaceholder")}
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
							onFocus={() => setSearchOpen(true)}
							onBlur={() => {
								window.setTimeout(() => setSearchOpen(false), 120);
							}}
							onKeyDown={(event) => {
								if (event.key === "Escape") {
									setSearchValue("");
									setSearchOpen(false);
									return;
								}

								if (event.key === "Enter" && primarySearchTarget) {
									event.preventDefault();
									navigate(primarySearchTarget);
									setSearchValue("");
									setSearchOpen(false);
								}
							}}
						/>
					</div>
						{searchOpen ? (
							<div className="absolute left-0 top-[calc(100%+0.6rem)] z-30 w-full rounded-[1rem] border border-border bg-elevated p-4 shadow-soft">
								<p className="mb-3 text-xs font-medium text-muted-foreground">
									{t("topbar.searchHelper")}
								</p>
								<div className="mb-4 flex flex-wrap gap-2">
									<div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/45 px-3 py-1.5 text-xs text-muted-foreground">
										<span className="rounded-full bg-elevated px-2 py-0.5 font-semibold text-foreground">
											N
										</span>
										<span>{t("topbar.shortcutsCreateOffer")}</span>
									</div>
									<div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/45 px-3 py-1.5 text-xs text-muted-foreground">
										<span className="rounded-full bg-elevated px-2 py-0.5 font-semibold text-foreground">
											O
										</span>
										<span>{t("topbar.shortcutsIdentifyCustomer")}</span>
									</div>
								</div>

								{!hasSearchQuery ? (
									<p className="text-sm text-muted-foreground">
										{t("topbar.searchPlaceholder")}
									</p>
								) : globalSearch.isLoading ? (
									<p className="text-sm text-muted-foreground">
										{t("topbar.searchLoading")}
									</p>
								) : hasSearchResults ? (
									<div className="space-y-4">
										{globalSearch.data?.member ? (
											<div className="space-y-2">
												<p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
													{t("topbar.searchSectionMember")}
												</p>
												<button
													type="button"
													className="flex w-full items-center justify-between rounded-[1rem] border border-border bg-surface-2/45 px-3 py-3 text-left transition-colors hover:bg-surface-2"
													onMouseDown={(event) => event.preventDefault()}
													onClick={() => {
														navigate(
															`/customers/identify/${globalSearch.data?.member?.public_user_id}`,
														);
														setSearchValue("");
														setSearchOpen(false);
													}}
												>
													<div className="min-w-0">
														<p className="truncate text-sm font-semibold text-foreground">
															{[
																globalSearch.data.member.first_name,
																globalSearch.data.member.last_name,
															]
																.filter(Boolean)
																.join(" ") || globalSearch.data.member.public_user_id}
														</p>
														<p className="truncate text-xs text-muted-foreground">
															{globalSearch.data.member.public_user_id}
														</p>
													</div>
													<span className="text-xs font-semibold text-primary">
														{t("topbar.searchOpen")}
													</span>
												</button>
											</div>
										) : null}

										{globalSearch.data?.offers.length ? (
											<div className="space-y-2">
												<div className="flex items-center justify-between gap-3">
													<p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
														{t("topbar.searchSectionOffers")}
													</p>
													<button
														type="button"
														className="text-xs font-semibold text-primary transition-colors hover:text-primary-strong"
														onClick={() => {
															navigate("/offers");
															setSearchValue("");
														}}
													>
														{t("topbar.searchViewAllOffers")}
													</button>
												</div>
												<div className="space-y-2">
													{globalSearch.data.offers.map((offer) => (
														<button
															key={offer.id}
															type="button"
															className="flex w-full items-center justify-between rounded-[1rem] border border-border bg-surface-2/45 px-3 py-3 text-left transition-colors hover:bg-surface-2"
															onMouseDown={(event) => event.preventDefault()}
															onClick={() => {
																navigate(`/offers/${offer.id}`);
																setSearchValue("");
																setSearchOpen(false);
															}}
														>
															<div className="min-w-0">
																<p className="truncate text-sm font-semibold text-foreground">
																	{offer.title}
																</p>
																<p className="truncate text-xs text-muted-foreground">
																	{t(`common.status.${offer.status}`)}
																</p>
															</div>
															<span className="text-xs font-semibold text-primary">
																{t("topbar.searchOpen")}
															</span>
														</button>
													))}
												</div>
											</div>
										) : null}

										{globalSearch.data?.tickets.length ? (
											<div className="space-y-2">
												<div className="flex items-center justify-between gap-3">
													<p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
														{t("topbar.searchSectionTickets")}
													</p>
													<button
														type="button"
														className="text-xs font-semibold text-primary transition-colors hover:text-primary-strong"
														onClick={() => {
															navigate("/support");
															setSearchValue("");
														}}
													>
														{t("topbar.searchViewAllTickets")}
													</button>
												</div>
												<div className="space-y-2">
													{globalSearch.data.tickets.map((ticket) => (
														<button
															key={ticket.id}
															type="button"
															className="flex w-full items-center justify-between rounded-[1rem] border border-border bg-surface-2/45 px-3 py-3 text-left transition-colors hover:bg-surface-2"
															onMouseDown={(event) => event.preventDefault()}
															onClick={() => {
																navigate(`/support/tickets/${ticket.id}`);
																setSearchValue("");
																setSearchOpen(false);
															}}
														>
															<div className="min-w-0">
																<p className="truncate text-sm font-semibold text-foreground">
																	{ticket.subject}
																</p>
																<p className="truncate text-xs text-muted-foreground">
																	{formatDate(ticket.updated_at)}
																</p>
															</div>
															<span className="text-xs font-semibold text-primary">
																{t("topbar.searchOpen")}
															</span>
														</button>
													))}
												</div>
											</div>
										) : null}
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										{t("topbar.searchEmpty")}
									</p>
								)}
							</div>
						) : null}
					</div>
					<div className="group relative">
						<button
							aria-label={t("topbar.notifications")}
							className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-elevated shadow-soft"
							type="button"
						>
							<HiOutlineBell
								aria-hidden="true"
								className="h-5 w-5 text-foreground"
							/>
							{unreadNotifications.length > 0 ? (
								<span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_42%,transparent)]" />
							) : null}
						</button>
						<div className="pointer-events-none absolute left-0 top-[calc(100%+0.6rem)] z-30 w-[min(21rem,calc(100vw-2rem))] translate-y-1 rounded-[1rem] border border-border bg-elevated p-4 opacity-0 shadow-soft transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:left-auto sm:right-0 sm:w-80">
							<div className="flex items-center justify-between gap-3">
								<p className="text-sm font-semibold text-foreground">
									{t("topbar.notifications")}
								</p>
								{unreadNotifications.length > 0 ? (
									<button
										type="button"
										className="text-xs font-semibold text-primary transition-colors hover:text-primary-strong"
										onClick={() => {
											void handleMarkAllNotificationsRead();
										}}
									>
										{t("topbar.notificationsMarkAllRead")}
									</button>
								) : null}
							</div>
							<div className="mt-3 space-y-2">
								{notifications.isLoading ? (
									<p className="text-sm text-muted-foreground">
										{t("topbar.notificationsLoading")}
									</p>
								) : notifications.data && notifications.data.length > 0 ? (
									notifications.data.map((notification) => (
										<div
											key={notification.id}
											className={`rounded-[1rem] border px-3 py-3 ${
												notification.is_read
													? "border-border bg-surface-2/45"
													: "border-primary/20 bg-primary-weak/55"
											}`}
										>
											<p className="text-sm font-semibold text-foreground">
												{notification.title}
											</p>
											{notification.body ? (
												<p className="mt-1 text-sm leading-6 text-muted-foreground">
													{notification.body}
												</p>
											) : null}
											<p className="mt-2 text-xs text-muted-foreground">
												{formatDate(notification.created_at)}
											</p>
										</div>
									))
								) : (
									<p className="text-sm text-muted-foreground">
										{t("topbar.notificationsEmpty")}
									</p>
								)}
							</div>
						</div>
					</div>
					<div className="group relative ml-auto">
						<button
							aria-label={t("topbar.accountMenu")}
							className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent p-0 shadow-none outline-none"
							type="button"
						>
							{business.isLoading ? (
								<Skeleton className="h-12 w-12 rounded-full" />
							) : business.data?.profile_image_url ? (
								<LazyImage
									className="h-12 w-12 rounded-full object-cover"
									src={business.data.profile_image_url}
									alt={business.data.name ?? t("common.labels.newBusiness")}
									wrapperClassName="h-12 w-12 rounded-full"
									skeletonClassName="rounded-full"
								/>
							) : (
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
									{(
										business.data?.name?.[0] ??
										user?.email?.[0] ??
										"B"
									).toUpperCase()}
								</div>
							)}
						</button>
						<div className="pointer-events-none absolute right-0 top-[calc(100%+0.6rem)] z-30 min-w-56 translate-y-1 rounded-[1rem] border border-border bg-elevated p-2 opacity-0 shadow-soft transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
							<div className="border-b border-border/70 px-3 py-2">
								<p className="truncate text-sm font-semibold text-foreground">
									{user?.email ?? t("common.labels.newBusiness")}
								</p>
								{business.data ? (
									<div className="mt-2">
										<Badge
											tone={
												business.data.subscription_status === "active"
													? "success"
													: "warning"
											}
											className="w-full justify-center"
										>
											{t(`common.status.${business.data.subscription_status}`)}
										</Badge>
									</div>
								) : null}
							</div>
							<div className="py-1">
								<Link
									className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
									to="/profile"
								>
									<HiOutlineBriefcase
										aria-hidden="true"
										className="h-4 w-4 text-muted-foreground"
									/>
									<span>{t("sidebar.profile")}</span>
								</Link>
								<Link
									className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
									to="/settings"
								>
									<HiOutlineCog6Tooth
										aria-hidden="true"
										className="h-4 w-4 text-muted-foreground"
									/>
									<span>{t("sidebar.settings")}</span>
								</Link>
								<Link
									className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
									to="/settings/subscription"
								>
									<HiOutlineCreditCard
										aria-hidden="true"
										className="h-4 w-4 text-muted-foreground"
									/>
									<span>{t("sidebar.subscription")}</span>
								</Link>
								<button
									className="flex w-full items-center gap-2 rounded-[0.85rem] px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
									onClick={() => void handleSignOut()}
									type="button"
								>
									<HiOutlineArrowLeftOnRectangle
										aria-hidden="true"
										className="h-4 w-4 text-muted-foreground"
									/>
									<span>{t("common.buttons.signOut")}</span>
								</button>
							</div>
						</div>
					</div>
				</FadeIn>

				<Outlet />
				<AppFooter />
			</main>
		</div>
	);
}
