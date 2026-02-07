-- phpMyAdmin SQL Dump
-- version 4.6.6deb5
-- https://www.phpmyadmin.net/
--
-- Client :  localhost:3306
-- Généré le :  Mer 21 Novembre 2018 à 03:02
-- Version du serveur :  5.7.24-0ubuntu0.18.04.1
-- Version de PHP :  7.2.10-0ubuntu0.18.04.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données :  `biblio`
--

-- --------------------------------------------------------

--
-- Structure de la table `administrateur`
--

CREATE TABLE `administrateur` (
  `id_ad` int(4) NOT NULL,
  `nm_ad` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `pnm_ad` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `email_ad` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `pwd_ad` varchar(30) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Contenu de la table `administrateur`
--

INSERT INTO `administrateur` (`id_ad`, `nm_ad`, `pnm_ad`, `email_ad`, `pwd_ad`) VALUES
(1, 'super', 'admin', 'admin@mail', 'admin');

-- --------------------------------------------------------

--
-- Structure de la table `auteur`
--

CREATE TABLE `auteur` (
  `id_a` int(4) NOT NULL,
  `nm_a` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `pnm_a` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `email_a` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `pwd_a` varchar(30) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Contenu de la table `auteur`
--

INSERT INTO `auteur` (`id_a`, `nm_a`, `pnm_a`, `email_a`, `pwd_a`) VALUES
(1, 'nomauteur1', 'prenomauteur2', 'aut1@mail', 'aut1'),
(2, 'nomauteur2', 'prenomauteur2', 'aut2@mail', 'aut2');

-- --------------------------------------------------------

--
-- Structure de la table `emprunt`
--

CREATE TABLE `emprunt` (
  `id_emp` int(4) NOT NULL,
  `id_l` int(4) NOT NULL,
  `date_emp` datetime NOT NULL,
  `date_fin` datetime NOT NULL,
  `id_us` int(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Contenu de la table `emprunt`
--

INSERT INTO `emprunt` (`id_emp`, `id_l`, `date_emp`, `date_fin`, `id_us`) VALUES
(1, 1, '2018-11-23 22:34:08', '2018-12-21 22:34:08', 2),
(2, 1, '2018-11-01 00:00:00', '2018-11-19 00:00:00', 2);

-- --------------------------------------------------------

--
-- Structure de la table `livre`
--

CREATE TABLE `livre` (
  `id_li` int(4) NOT NULL,
  `titre_li` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `categorie` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `id_auth` int(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Contenu de la table `livre`
--

INSERT INTO `livre` (`id_li`, `titre_li`, `categorie`, `id_auth`) VALUES
(1, 'JAVA', 'Informatique', 1);

-- --------------------------------------------------------

--
-- Structure de la table `utilisateur`
--

CREATE TABLE `utilisateur` (
  `id_u` int(4) NOT NULL,
  `nm_u` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `pnm_u` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `email_u` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `pwd_u` varchar(30) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Contenu de la table `utilisateur`
--

INSERT INTO `utilisateur` (`id_u`, `nm_u`, `pnm_u`, `email_u`, `pwd_u`) VALUES
(1, 'koffi', 'michel', 'jmk@email.net', 'premier'),
(2, 'Dike', 'Daniel', 'dani@mail', 'dani');

--
-- Index pour les tables exportées
--

--
-- Index pour la table `administrateur`
--
ALTER TABLE `administrateur`
  ADD PRIMARY KEY (`id_ad`);

--
-- Index pour la table `auteur`
--
ALTER TABLE `auteur`
  ADD PRIMARY KEY (`id_a`);

--
-- Index pour la table `emprunt`
--
ALTER TABLE `emprunt`
  ADD PRIMARY KEY (`id_emp`),
  ADD KEY `id_l` (`id_l`),
  ADD KEY `id_us` (`id_us`);

--
-- Index pour la table `livre`
--
ALTER TABLE `livre`
  ADD PRIMARY KEY (`id_li`),
  ADD KEY `id_auth_2` (`id_auth`);

--
-- Index pour la table `utilisateur`
--
ALTER TABLE `utilisateur`
  ADD PRIMARY KEY (`id_u`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `administrateur`
--
ALTER TABLE `administrateur`
  MODIFY `id_ad` int(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT pour la table `auteur`
--
ALTER TABLE `auteur`
  MODIFY `id_a` int(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT pour la table `emprunt`
--
ALTER TABLE `emprunt`
  MODIFY `id_emp` int(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT pour la table `livre`
--
ALTER TABLE `livre`
  MODIFY `id_li` int(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT pour la table `utilisateur`
--
ALTER TABLE `utilisateur`
  MODIFY `id_u` int(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `emprunt`
--
ALTER TABLE `emprunt`
  ADD CONSTRAINT `emprunt_ibfk_1` FOREIGN KEY (`id_l`) REFERENCES `livre` (`id_li`),
  ADD CONSTRAINT `emprunt_ibfk_2` FOREIGN KEY (`id_us`) REFERENCES `utilisateur` (`id_u`);

--
-- Contraintes pour la table `livre`
--
ALTER TABLE `livre`
  ADD CONSTRAINT `livre_ibfk_1` FOREIGN KEY (`id_auth`) REFERENCES `auteur` (`id_a`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;