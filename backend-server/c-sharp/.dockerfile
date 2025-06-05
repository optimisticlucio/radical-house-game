# Stage 1: Build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy csproj and restore as separate step
COPY radibate-backend/radibate-backend.csproj ./radibate-backend/
RUN dotnet restore radibate-backend/radibate-backend.csproj

# Copy the full source code and build
COPY . ./
RUN dotnet publish radibate-backend/radibate-backend.csproj -c Release -o /out

# Stage 2: Run the app
FROM mcr.microsoft.com/dotnet/runtime:8.0
WORKDIR /app

# Copy published output
COPY --from=build /out ./

# Let Render provide the port via $PORT
ENV ASPNETCORE_URLS=http://+:$PORT

# Optional: expose a default port (Render doesn't need it, but good practice)
EXPOSE 8080

# Run the app
ENTRYPOINT ["dotnet", "radibate-backend.dll"]
