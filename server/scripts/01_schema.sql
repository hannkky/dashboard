-- SQL Server schema aligned to current AUTPLAN tables

IF OBJECT_ID('dbo.Unidades', 'U') IS NOT NULL DROP TABLE dbo.Unidades;
IF OBJECT_ID('dbo.Planeaciones', 'U') IS NOT NULL DROP TABLE dbo.Planeaciones;
IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL DROP TABLE dbo.Usuarios;

CREATE TABLE dbo.Usuarios (
  UsuarioId BIGINT IDENTITY(1,1) PRIMARY KEY,
  NombreUsuario NVARCHAR(80) NOT NULL UNIQUE,
  ContrasenaHash NVARCHAR(255) NOT NULL,
  NombreCompleto NVARCHAR(120) NULL,
  Rol NVARCHAR(20) NOT NULL DEFAULT 'user',
  Activo BIT NOT NULL DEFAULT 1,
  FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.Planeaciones (
  PlaneacionId BIGINT IDENTITY(1,1) PRIMARY KEY,
  UsuarioId BIGINT NOT NULL,
  Docente NVARCHAR(200) NOT NULL,
  Materia NVARCHAR(200) NOT NULL,
  Grupo NVARCHAR(50) NOT NULL,
  Carrera NVARCHAR(200) NULL,
  Periodo NVARCHAR(50) NULL,
  Estado NVARCHAR(30) NOT NULL DEFAULT 'Pendiente',
  Especialidad NVARCHAR(200) NULL,
  Grado NVARCHAR(20) NULL,
  HorasTotales INT NULL,
  Turno NVARCHAR(30) NULL,
  FechaElaboracion DATE NULL,
  FechaInicio DATE NULL,
  FechaFin DATE NULL,
  Archivo NVARCHAR(255) NULL,
  Archivado BIT NOT NULL DEFAULT 0,
  FechaArchivado DATETIME2 NULL,
  FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  FechaActualizacion DATETIME2 NULL,
  Horas NVARCHAR(100) NULL,
  Competencias NVARCHAR(MAX) NULL,
  Fecha DATE NULL,
  CONSTRAINT FK_Planeaciones_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(UsuarioId)
);

CREATE TABLE dbo.Unidades (
  UnidadId BIGINT IDENTITY(1,1) PRIMARY KEY,
  PlaneacionId BIGINT NOT NULL,
  Titulo NVARCHAR(300) NOT NULL,
  FechaPlaneada NVARCHAR(50) NULL,
  FechaReal NVARCHAR(50) NULL,
  FechaEvaluacionPlaneada NVARCHAR(50) NULL,
  FechaEvaluacionReal NVARCHAR(50) NULL,
  FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_Unidades_Planeaciones FOREIGN KEY (PlaneacionId) REFERENCES dbo.Planeaciones(PlaneacionId)
);

CREATE INDEX IX_Planeaciones_Estado ON dbo.Planeaciones(Estado, Periodo);
CREATE INDEX IX_Unidades_Planeacion ON dbo.Unidades(PlaneacionId);
